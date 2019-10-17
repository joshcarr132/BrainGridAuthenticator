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
let dbClient;
let connection;


const Auth = require('./src/scripts/auth.js');
const commandBlock = require('./src/scripts/commandBlock.js');
let ctxClient;

app.use('/', express.static(path.join(__dirname, '/src')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '/src/index.html'));
});

io.on('connection', (socket) => {
  console.log('web client connected');
  socket.on('disconnect', () => {
    console.log('web client disconnected');
  });

  // initialize db connection
  dbClient = new MongoClient(dbURL);
  dbClient.connect((err) => {
    if (err) { throw new Error(err); }
    console.log(`Connected to mongodb server at: ${dbURL}`);
    const db = dbClient.db(dbName);
    collection = db.collection('passwords');
  });

  socket.on('ready', (id) => {
    collection.find({ _id: id }).toArray().then((doc) => {
        if (doc.length > 0) {
          socket.emit('db_response', doc);
        } else {
          socket.emit('db_response', -1);
        }
      });
    });

  socket.on('create_success', (dbEntry) => {
    // send to db
    console.log('adding new entry to database');
    collection.insertOne(dbEntry);
  });

  // CORTEX API
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
