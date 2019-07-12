const path = require('path');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;


// init express and websocket
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);


// init mongodb
const dbURL = 'mongodb://localhost:27017';
const dbName = 'bci-dev';
// const dbClient = new MongoClient(dbURL);
let dbClient;


const commandBlock = require('./src/scripts/commandBlock.js');
const Auth = require('./src/scripts/auth.js');

let ctxClient;

app.use('/', express.static(path.join(__dirname, '/src')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '/src/index.html'));
});

io.on('connection', (socket) => {
  console.log('ctxClient connected');
  socket.on('disconnect', () => {
    console.log('ctxClient disconnected');
  });

  socket.on('ready', (id) => {
    dbClient = new MongoClient(dbURL);
    dbClient.connect((err) => {
      if (err) { throw new Error(); }
      console.log('connected to mongodb server!!!')
      const db = dbClient.db(dbName);
      const collection = db.collection('passwords');

      collection.findOne({id: 99}).then(doc => console.log(doc));
      // TODO: now that this works, figure out the format to send to grid for template/guide 
    });

    console.log(id);
  });


  // socket.on('ready', () => {
  //   commandBlock.initClient(Auth)
  //     .then((ctxClient) => {
  //       console.log(`client: ${ctxClient}`);
  //     });
  //   // .then(() => { commandBlock.loadTrainingProfile(ctxClient); });
  // });

  // socket.on('initCmdBlock', () => {
  //   console.log('init command block');
  //   commandBlock.commandBlock(ctxClient)
  //     .then((data) => {
  //       socket.emit('command', data.output); // send command back to browser client
  //     });
  // });
});

http.listen(3000, () => {
  console.log('listening on *:3000');
});
