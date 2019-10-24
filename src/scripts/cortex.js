/* Wrapper class for Emotiv Cortex V2 API

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

    The basic flow to get data from the Emotiv device is this:
      - Create Cortex object, passing in API credentials as auth
      - Cortex.ready Promise resolves once websocket has been initialized--no
        API calls can occur before this. Therefore all API calls should be
        chained together starting with Cortex.ready.then(...)
      - Cortex.getHeadsetId() & Cortex.authorize() must be called before
        initializing a session
      - Cortex.createSession() to start a session with the device
      - Cortex.subscribe([ streams ]) to subscribe to desired streams. Data
        events will be printed to the console as they come in.

    Example of subscribing to mental commands ('com') stream:
        const auth = require('./auth.js');
        const ctx = new Cortex(auth, { verbose: true });

        ctx.ready.then(() => {
          ctx.authorize().then(() => {
            ctx.getHeadsetId().then(() => {
              ctx.createSession().then(() => {
                ctx.subscribe(['com']);
              });
            });
          });
        });
*/

const WebSocket = require('ws');

const CORTEX_URL = 'wss://localhost:6868';


class Cortex {
  constructor(auth, options = {}) {
    this.options = options;
    this.auth = auth;

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;
    this.ws = new WebSocket(CORTEX_URL);

    this.messageId = 0;
    this.awaitingResponse = 0;

    this.ws.addEventListener('close', () => {
      this.log('ws: Socket closed');
    });

    this.ready = new Promise((resolve) => {
      this.log('ctx: initialized Cortex object');
      this.ws.addEventListener('open', resolve);
    }).then(() => this.log('ws: Socket opened'));
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
      this.log(`ws: sending[${messageId}: ${method}] ${message}`);
      this.awaitingResponse++;

      this.ws.on('message', (data) => {
        const response = JSON.parse(data);
        if (response.id === messageId) {
          this.log(`ws: received[${messageId}: ${method}] ${JSON.stringify(response)}`);
          this.awaitingResponse--;
          resolve(response.result);
        }
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
          this.log(`ctx: assigning authToken: ${result.cortexToken}`);
          resolve(result.cortexToken);
        });
    });
  }

  getHeadsetId() {
    return new Promise((resolve) => {
      this.call('queryHeadsets')
        .then((result) => {
          const hsId = result[0].id;
          this.log(`ctx: assigning headsetId: ${hsId}`);
          this.headsetId = hsId;
          resolve(hsId);
        });
    });
  }

  createSession() {
    this.log('ctx: initializing session');

    return new Promise((resolve) => {
      const params = {
        cortexToken: this.authToken,
        status: 'open',
        headset: this.headsetId,
      };

      this.call('createSession', params)
        .then((result) => {
          this.log(`ctx: assigning sessionId: ${result.id}`);
          this.sessionId = result.id;
          resolve(result);
        });
    });
  }

  closeSession() {
    this.log('ctx: closing session');
    return new Promise((resolve) => {
      this.unsubscribe()
        .then(() => {
          const params = {
            cortexToken: this.authToken,
            session: this.sessionId,
            status: 'close',
          };

          this.call('updateSession', params);
        });
      resolve();
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
          this.log(`ctx: subscribed to ${streams}`);
          this.ws.on('message', (data) => {
            // this.log(data);
          });

          response.success.forEach((stream) => {
            this.streams.push(stream.streamName);
          });

          resolve(response);
        });
    });
  }

  unsubscribe(streams = this.streams) {
    // pass streams arg as an array
    return new Promise(() => {
      const params = {
        cortexToken: this.authToken,
        session: this.sessionId,
        streams,
      };

      this.call('unsubscribe', params)
        .then(() => {
          // TODO remove from this.streams
          this.log(`ctx: unsubscribed from ${streams}`);
        });
    });
  }

  loadProfile(profileName) {
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
      console.log('-----');
      console.log(...msg);
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
        // output: '',
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

                this.log(`ctx_session: [command: ${act}, power: ${pow}]`);

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

                setTimeout(() => {
                  this.closeSession();
                  resolve(this.processBlock(blockData));
                }, blockTime);
              }
            });
          });
        });
    });
  }

  processBlock(block) {
    this.log('ctx: command block ended');

    let highestPower;

    Object.keys(block.commands).forEach((key) => {
    // block.commands.keys.forEach((key) => {
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

// test methods here
const auth = require('./auth.js');

const ctx = new Cortex(auth, { verbose: true });

ctx.ready.then(() => {
  ctx.authorize().then(() => {
    ctx.getHeadsetId().then(() => {
      ctx.commandBlock();
    });
  });
});
