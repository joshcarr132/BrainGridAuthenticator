const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'bci-dev';
const client = new MongoClient(url, { useNewUrlParser: true });

// Use connect method to connect to the server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  insertDocuments(db, function() {
    client.close();
  });
});

const insertDocuments = function(db, callback) {
  // Get the documents collection
  const collection = db.collection('passwords');

  // remove everything in the db
  collection.deleteMany({});

  // add document
  collection.insertOne({
    _id: 99,
    start: [2, 2],
    moves: ['left', 'up', 'right', 'right'],
  }, (err, result) => {
    assert.equal(err, null);
    console.log('Inserted document into the collection');
    callback(result);
  });
};
