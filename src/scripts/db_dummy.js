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
    id: 99,
    start: [2, 2],
    moves: ['left', 'up', 'right', 'right'],
    circle: [3, 1],
    pathString: 'M450,450L270,450L270,270L450,270L630,270',
  }, (err, result) => {
    assert.equal(err, null);
    console.log('Inserted document into the collection');
    callback(result);
  });
};
