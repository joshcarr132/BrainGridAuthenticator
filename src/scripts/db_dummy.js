const { MongoClient } = require('mongodb');
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'bci-dev';
const client = new MongoClient(url, { useNewUrlParser: true });


const insertDocuments = (db, callback) => {
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


// Use connect method to connect to the server
client.connect((err) => {
  assert.equal(null, err);
  console.log('Connected successfully to server');

  const db = client.db(dbName);

  insertDocuments(db, () => {
    client.close();
  });
});
