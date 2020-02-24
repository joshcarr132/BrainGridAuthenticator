/* Wrapper class for Emotiv Cortex V2 API
   https://emotiv.gitbook.io/cortex-api/

  constructor args:
    auth    => JSON object with client ID and secret
               If it is not passed to constructor, it must be passed to
               Cortex.authorize()
    options => JSON object with options
    verbose: true => log debugging info to console

  usage:
    Promises are used extensively to handle asynchronous API calls. Each API
    call method returns a Promise; the result field of the API response can be
    accessed using:
      [method].then((result) => {
        *do something with result*
      });

    Cortex.call(method, params) can be used to call any API method. Other
    methods are wrappers around Cortex.call().

*/

const CORTEX_URL = 'wss://localhost:6868';
const WebSocket = require('ws');
const chalk = require('chalk');

const fs = require('fs');
const util = require('util');
const path = require('path');

const logFile = fs.createWriteStream(path.join(__dirname, '/../../debug.log'), { flags: 'a' });

class Cortex {
  constructor(auth, options = {}) {
    this.options = options;
    this.auth = auth;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    this.ws = new WebSocket(CORTEX_URL);

    this.messageId = 0;
    this.awaitingResponse = 0;

    this.ws.addEventListener('close', () => {
      log('Socket closed');
    });

    this.ws.setMaxListeners(10);

    this.ready = new Promise((resolve) => {
      log('initialized Cortex object');
      this.ws.addEventListener('open', resolve);
    }).then(() => log('Socket opened'));
  }

  call(method, params = {}) {
    return new Promise((resolve) => {
      const messageId = this.messageId++;
      const request = {
        jsonrpc: '2.0',
        method,
        params,
        id: messageId,
      };

      const message = JSON.stringify(request);
      this.ws.send(message);
      log(`sending[${messageId}: ${method}]`);
      this.awaitingResponse++;

      const ctx = this;

      function messageHandler(data) {
        const response = JSON.parse(data);
        if (response.id === messageId) {
          log(`received[${messageId}: ${method}]`);
          ctx.awaitingResponse--;
          ctx.ws.removeEventListener('message', messageHandler);
          resolve(response.result);
        }
      }

      this.ws.on('message', messageHandler);
    });
  }

  initialize() {
    return new Promise((resolve) => {
      this.ready.then(() => {
        this.authorize().then(() => {
          this.getHeadsetId().then(() => {
            resolve(this);
          });
        });
      });
    });
  }

  authorize(auth = this.auth) {
    return new Promise((resolve) => {
      const params = {
        clientId: auth.client_id,
        clientSecret: auth.client_secret,
        debit: 1,
      };

      this.call('authorize', params)
        .then((result) => {
          this.authToken = result.cortexToken;
          log(`assigning authToken: ${result.cortexToken.slice(0, 20)}...`);
          resolve(result.cortexToken);
        });
    });
  }

  getHeadsetId() {
    return new Promise((resolve, reject) => {
      this.call('queryHeadsets')
        .then((result) => {
          if (result[0]) { // headset was found
            const hsId = result[0].id;
            log(`assigning headsetId: ${hsId}`);
            this.headsetId = hsId;
            resolve(hsId);
          } else {
            reject(new Error('no connected headset was found'));
          }
        });
    }).catch((error) => { log(error); });
  }

  createSession(authToken = this.authToken, status = 'open') {
    log('initializing session');

    return new Promise((resolve) => {
      const params = {
        cortexToken: authToken,
        status,
        headset: this.headsetId,
      };

      this.call('createSession', params)
        .then((result) => {
          log(`assigning sessionId: ${result.id}`);
          this.sessionId = result.id;
          resolve(result);
        });
    });
  }

  closeSession() {
    log('closing session');
    return new Promise((resolve) => {
      const params = {
        cortexToken: this.authToken,
        session: this.sessionId,
        status: 'close',
      };

      this.call('updateSession', params)
        .then(() => {
          log('session closed');
          resolve();
        });
    });
  }

  subscribe(streams = ['com']) {
    // pass streams args as an array
    return new Promise((resolve) => {
      this.streams = [];

      const params = {
        cortexToken: this.authToken,
        session: this.sessionId,
        streams,
      };

      this.call('subscribe', params)
        .then((response) => {
          log(`subscribed to ${streams}`);

          response.success.forEach((stream) => {
            this.streams.push(stream.streamName);
          });

          resolve(response);
        });
    });
  }

  unsubscribe(streams = this.streams) {
    // pass streams arg as an array
    return new Promise((resolve) => {
      const params = {
        cortexToken: this.authToken,
        session: this.sessionId,
        streams,
      };

      this.call('unsubscribe', params)
        .then((result) => {
          if (!result.failure) {
            this.streams = [];
            log(`unsubscribed from ${JSON.stringify(result.success)}`);
            resolve(result);
          }
        });
    });
  }

  loadProfile(profileName) {
    // load a profile to use with the emotiv device
    // if no profileName arg given, calls selectProfile
    // if any profile is currently loaded, it is unloaded first
    return new Promise(() => {
      const paramsUnload = {
        cortexToken: this.authToken,
        status: 'unload',
        headset: this.headsetId,
        profile: '',
      };

      const paramsLoad = {
        cortexToken: this.authToken,
        status: 'load',
        profile: profileName,
      };

      this.call('setupProfile', paramsUnload)
        .then(() => {
          this.call('setupProfile', paramsLoad);
        });
    });
  }

  closeSocket(force = false) {
    if (force) {
      this.ws.close();
    } else if (this.awaitingResponse === 0) {
      this.ws.close();
    } else {
      setTimeout(() => { this.close(); }, 250);
    }
  }

  commandBlock(blockTime = 8000, socket) {
    return new Promise((resolve, reject) => {
      const blockData = {
        output: '',
        commands: {},
      };

      this.createSession({ auth: this.auth, status: 'open' })
        .then(() => {
          this.subscribe(['com']).then((subs) => {
            if (subs.failure.length > 0) {
              reject(new Error('failed to subscribe'));
            }

            log('initializing command block\n**********START BLOCK');

            function commandHandler(msg) {
              msg = JSON.parse(msg);
              if (msg.com) {
                const act = msg.com[0];
                const pow = msg.com[1];

                socket.emit('dir', act);

                if (pow > 0) {
                  log(`${genTimestamp(new Date(msg.time * 1000))} - [command: ${act}, power: ${pow}]`);
                }

                if (!blockData.commands.hasOwnProperty(act)) {
                  blockData.commands[act] = { count: 1, power: pow };
                } else {
                  blockData.commands[act].count++;
                  blockData.commands[act].power += pow;
                }
              }
            }

            this.ws.on('message', commandHandler);
            log('command listener attached');

            setTimeout(() => {
              log('session ended due to timeout\n**********END BLOCK');
              this.closeSession();
              this.ws.removeEventListener('message', commandHandler);
              log('command listener removed');
              resolve(processBlock(blockData));
            }, blockTime);
          });
        });
    });
  }
}

function processBlock(block) {
  log('command block ended');

  let highestPower;

  Object.keys(block.commands).forEach((key) => {
    const command = block.commands[key];

    if (!highestPower) {
      highestPower = { key, command };
    } else if (command.power > highestPower.command.power) {
      highestPower = { key, command };
    }

    block.output = highestPower;
  });

  log(`command: ${JSON.stringify(block.output)}`);
  return block;
}

function log(...msg) {
  const timestamp = genTimestamp();
  console.log(`${timestamp}: ${chalk.cyan('[ctx]')} ${msg}`);
  logFile.write(`${timestamp}: [ctx] ${util.format(msg)}\n`);
}

function genTimestamp(time = new Date()) {
  return `${time.toLocaleTimeString('en-CA', { hour12: false })}.${time.getMilliseconds()}`;
}

module.exports = Cortex;
