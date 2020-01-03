const Cortex = require('../cortex.js');
const Auth = require('../auth.js');

const ctx = new Cortex(Auth, { verbose: true });

ctx.ready.then(() => {
  ctx.authorize().then(() => {
    ctx.getHeadsetId().then(() => {
      ctx.createSession({ auth: ctx.auth, status: 'open'})
        .then((result) => {
          console.log(result);
          ctx.subscribe(['eeg']).then((subs) => {
            ctx.ws.on('message', (msg) => {
              console.log(msg);
            });
          });
        });
    });
  });
});
