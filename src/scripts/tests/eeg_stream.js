const Cortex = require('../cortex.js');
const Auth = require('../auth.js');

const ctx = new Cortex(Auth, { verbose: true });

ctx.ready.then(() => {
  ctx.authorize().then(() => {
    ctx.getHeadsetId().then(() => {
      ctx.createSession(ctx.authToken, 'active')
        .then((result) => {
          console.log(result);
          ctx.subscribe(['eeg']).then((subs) => {
            console.log(subs);

            ctx.ws.on('message', (msg) => {
              msg = JSON.parse(msg);
              console.log(msg.eeg.slice(2, -3));
            });
          });
        });
    });
  });
});
