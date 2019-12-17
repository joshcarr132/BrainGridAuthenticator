const Cortex = require('../cortex.js');
const Auth = require('../auth.js');

const ctxClient = new Cortex(Auth, { verbose: true });

ctxClient.ready.then(() => {
  ctxClient.authorize().then(() => {
    ctxClient.getHeadsetId().then(() => {
      ctxClient.commandBlock(1, 2000).then((data) => {
        console.log(data);
      });
    });
  });
});
