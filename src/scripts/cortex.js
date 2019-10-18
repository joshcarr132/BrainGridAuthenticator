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
      this.ws.addEventListener('open', resolve);
    }).then(() => this.log('ws: Socket opened'));
  }

  call(method, params = {}) {
    const messageId = this.messageId++;
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: messageId,
    };

    return new Promise((resolve) => {
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
          this.headsetId = hsId;
          this.log(`ctx: assigning headsetId: ${hsId}`);
          resolve(hsId);
        });
    });
  }

  initSession() {
    this.log('ctx: initializing session');

    return new Promise((resolve, reject) => {
      if (this.authToken) {
        this.authorize(this.auth)
          .then((token) => {
            this.initSession(token);
            reject();
          });
      }

      const params = {
        cortexToken: this.authToken,
        status: 'open',
        headset: this.headsetId,
      };

      this.call('createSession', params)
        .then((result) => {
          //
          this.session = result;
          resolve(result);
        });
    });
  }

  closeSession() {
    this.log('ctx: closing session');
    //
    return new Promise((resolve) => {
      resolve();
    });
  }


  log(...msg) {
    if (this.options.verbose === true) {
      console.log('-----');
      console.log(...msg);
    }
  }

  close(force = false) {
    if (force) {
      this.ws.close();
    } else if (this.awaitingResponse === 0) {
      this.ws.close();
    } else {
      setTimeout(() => { this.close(); }, 250);
    }
  }
}

// test methods here
const auth = require('./auth.js');

const ctx = new Cortex(auth, { verbose: true });

// ctx.ready.then(() => {
//     ctx.call('getCortexInfo')
//           .then((result) => {
//               // console.log(result);
//           });
// }).then(() => {
//     ctx.call('getUserLogin')
//         .then((result) => {
//             // console.log(result);
//         });
// }).then(() => {
//     ctx.getHeadsetId()
//         .then(() => {
//             ctx.authorize(auth)
//                 .then(() => {
//                     ctx.initSession();
//                 });
//         });
// })
//     .then(() => {
//     ctx.close();
// });

ctx.ready.then(() => {
  ctx.authorize().then(() => {
    ctx.getHeadsetId().then(() => {
      ctx.initSession();
    });
  });
});
