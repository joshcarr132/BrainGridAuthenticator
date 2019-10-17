const WebSocket = require('ws');
const CORTEX_URL = 'wss://localhost:6868';


class Cortex {
    constructor(options = {}) {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0;
        this.ws = new WebSocket(CORTEX_URL);

        this.messageId = 0;

        this.ws.addEventListener('close', () => {
            this._log('ws: Socket closed');
        });

        this.ready = new Promise((resolve) => {
            this.ws.addEventListener('open', resolve);
        })

        .then(() => console.log('ws: Socket opened'));
    }

    call(method, params = {}) {
        const messageId = this.messageId++;
        const request = {
            "jsonrpc": "2.0",
            "method": method,
            "params": params,
            "id": messageId,
        };

        return new Promise((resolve, reject) => {

            this.ws.send(JSON.stringify(request));

            this.ws.on('message', (data) => {
                const response = JSON.parse(data);
                if (response['id'] === messageId) {
                    resolve(response['result']);
                }
            });
        });
    }

    authorize(auth) {
        const params = {
            clientId: auth.client_id,
            clientSecret: auth.client_secret,
            debit: 1,
        };

        this.call("authorize", params)
            .then((result) => {
                this.authToken = result.cortexToken;
            });
    }
}


// test methods here
const auth = require("./auth.js");
const ctx = new Cortex();

ctx.ready.then(() => {
    ctx.call("getCortexInfo")
          .then((result) => {
              console.log(result);
          });
}).then(() => {
    ctx.call("getUserLogin")
        .then((result) => {
            console.log(result);
        });
}).then(() => {
    ctx.authorize(auth);
}).then(() => {
    ctx.call("queryHeadsets")
        .then((result) => {
            console.log(result);
        });
});

