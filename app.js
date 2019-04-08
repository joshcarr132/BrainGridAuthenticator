const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

const commandBlock = require('./src/scripts/commandBlock.js');
const Auth = require('./src/scripts/auth.js');


app.use('/', express.static(path.join(__dirname, '/src')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve( __dirname + '/src/index.html' ));
});

io.on('connection', (socket) => {
  console.log('client connected');
  socket.on('disconnect', (socket) => {
      console.log('client disconnected');
  });

  socket.on('ready', () => {
    commandBlock.initClient(Auth)
      .then((ctxClient) => {
        client = ctxClient;
        console.log(`client: ${ctxClient}`);
      })
      .then(() => {commandBlock.loadTrainingProfile(client);});
  });
});


http.listen(3000, () => {
  console.log('listening on *:3000');
});
