const https = require('https');
const express = require('express');
const socketIO = require('socket.io');
const app = express();

app.use(express.static(__dirname));

const expressServer = https.createServer({}, app);
const io = socketIO(expressServer)

expressServer.listen(8181);