const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');

app.use(express.static('src'));
const commandBlock = require('./src/scripts/commandBlock.js');
const Auth = require('./src/scripts/auth.js');

app.get('/', (req, res) => {
    res.sendFile(path.resolve( __dirname + '/src/index.html' ));
    // res.sendFile(path.resolve( './index.html' ));
});

io.on('connection', (socket) => {
    console.log('a user connected');
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
