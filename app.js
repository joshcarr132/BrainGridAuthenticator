const verbose = true; // set true to have this module output debugging messages to the console
const chalk = require('chalk'); // for colorizing console output

const path = require('path');
const express = require('express');
const MongoClient = require('mongodb').MongoClient;


// express and websocket
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);


// mongodb
const dbURL = 'mongodb://localhost:27017';
const dbName = 'bci-dev';
let dbClient;
let collection;


// cortex api
const auth = require('./src/scripts/auth.js');
const Cortex = require('./src/scripts/cortex.js');


// setup paths for express
app.use('/', express.static(path.join(__dirname, '/src')));

app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '/src/index.html'));
});


// main
io.on('connection', (socket) => {
  log('web client connected');
  socket.on('disconnect', () => {
    log('web client disconnected');
  });

  // initialize db connection
  dbClient = new MongoClient(dbURL, { useNewUrlParser: true });
  dbClient.connect((err) => {
    if (err) { throw new Error(err); }
    log(`connected to mongodb server at: ${dbURL}`);
    const db = dbClient.db(dbName);
    collection = db.collection('passwords');
  });

  socket.on('ready', (id) => {
    // query db
    collection.find({ _id: id }).toArray().then((doc) => {
      if (doc.length > 0) {
        socket.emit('db_response', doc);
      } else {
        socket.emit('db_response', -1);
      }
    });

    // initialize + setup cortex client
    const ctxClient = new Cortex(auth, { verbose: true });

    ctxClient.ready.then(() => {
      ctxClient.authorize().then(() => {
        ctxClient.getHeadsetId();
      });
    });

    // initialize command blocks
    socket.on('initCmdBlock', () => {
      ctxClient.log('ctx: initializing command block');
      ctxClient.commandBlock(ctxClient)
        .then((data) => {
          socket.emit('command', data);
        });
    });
  });

  // send successfully created password to database
  socket.on('create_success', (dbEntry) => {
    collection.findOne({ _id: dbEntry._id }).then((doc) => {
      if (!doc) {
        log('adding new entry to database');
        log(JSON.stringify(dbEntry));
        collection.insertOne(dbEntry);
      } else {
        log('id already in database. aborting.');
      }
    });
  });
});

// start listening
http.listen(3000, () => {
  log('listening on *:3000');
});

function log(...msg) {
  if (verbose) {
    console.log(`${chalk.green('[app]')} ${msg}`);
    console.log('-----');
  }
}
