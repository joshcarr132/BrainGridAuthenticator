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


class Cortex {
  constructor(auth, options = {}) {
    this.options = options;
    this.auth = auth;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    this.ws = new WebSocket(CORTEX_URL);

    this.messageId = 0;
    this.awaitingResponse = 0;

    this.ws.addEventListener('close', () => {
      this.log('Socket closed');
    });

    this.ready = new Promise((resolve) => {
      this.log('initialized Cortex object');
      this.ws.addEventListener('open', resolve);
    }).then(() => this.log('Socket opened'));
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
      this.log(`sending[${messageId}: ${method}]`);
      this.awaitingResponse++;

      this.ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === messageId) {
          this.log(`received[${messageId}: ${method}]`);
          this.awaitingResponse--;
          resolve(response.result);
        }
      });
    });
  }

  initialize() {
    //
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
          this.log(`assigning authToken: ${result.cortexToken.slice(0, 20)}...`);
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
            this.log(`assigning headsetId: ${hsId}`);
            this.headsetId = hsId;
            resolve(hsId);
          } else {
            reject(new Error('no connected headset was found'));
          }
        });
    }).catch((error) => { this.log(error); });
  }

  createSession() {
    this.log('initializing session');

    return new Promise((resolve) => {
      const params = {
        cortexToken: this.authToken,
        status: 'open',
        headset: this.headsetId,
      };

      this.call('createSession', params)
        .then((result) => {
          this.log(`assigning sessionId: ${result.id}`);
          this.sessionId = result.id;
          resolve(result);
        });
    });
  }

  closeSession() {
    this.log('closing session');
    return new Promise((resolve) => {
      this.unsubscribe()
        .then(() => {
          const params = {
            cortexToken: this.authToken,
            session: this.sessionId,
            status: 'close',
          };

          this.call('updateSession', params)
            .then(() => {
              this.log('session closed');
              resolve();
            });
        });
      // resolve();
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
          this.log(`subscribed to ${streams}`);

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
          if (result.failure.length === 0) {
            this.streams = [];
            this.log(`unsubscribed from ${JSON.stringify(result.success)}`);
            resolve(result);
          }
        });
    });
  }

  loadProfile(profileName) {
    // TODO TEST
    // load a profile to use with the emotiv device
    // if no profileName arg given, calls selectProfile TODO
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

  selectProfile() {
    // list all profile names, allow user to select, then call loadProfile
    // with the selected profile name
  }

  log(...msg) {
    if (this.options.verbose === true) {
      console.log(`${chalk.cyan('[ctx]')} ${msg}`);
      console.log('-----');
    }
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

  commandBlock(blockId = 1, blockTime = 3000, threshold = 30) {
    return new Promise((resolve, reject) => {
      const blockData = {
        output: '',
        blockId,
        commands: {},
      };

      this.createSession({ auth: this.auth, status: 'open' })
        .then(() => {
          this.subscribe(['com']).then((subs) => {
            if (subs.failure.length > 0) {
              reject(new Error('failed to subscribe'));
            }

            this.ws.on('message', (msg) => {
              msg = JSON.parse(msg);
              if (msg.com) {
                const act = msg.com[0];
                const pow = msg.com[1];

                this.log(`[command: ${act}, power: ${pow}]`);

                if (!blockData.commands.hasOwnProperty(act)) {
                  blockData.commands[act] = { count: 1, power: pow };
                } else {
                  blockData.commands[act].count++;
                  blockData.commands[act].power += pow;
                }

                if (blockData.commands[act].power >= threshold) {
                  this.closeSession();
                  resolve(this.processBlock(blockData));
                }
              }
            });

            setTimeout(() => {
              this.closeSession();
              resolve(this.processBlock(blockData));
            }, blockTime);
          });
        });
    });
  }

  processBlock(block) {
    this.log('command block ended');

    let highestPower;

    Object.keys(block.commands).forEach((key) => {
      const command = block.commands[key];

      if (!highestPower) {
        highestPower = command;
      } else if (command.power > highestPower.power) {
        highestPower = command;
      }

      block.output = highestPower;

      return block;
    });
  }
}

module.exports = Cortex;
