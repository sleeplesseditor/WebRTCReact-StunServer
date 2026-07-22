const fs = require('fs');
const https = require('https');
const express = require('express');
const socketIO = require('socket.io');
const app = express();

app.use(express.static(__dirname));

const fsKey = fs.readFileSync('cert.key');
const fsCert = fs.readFileSync('cert.crt');

const expressServer = https.createServer({fsKey, fsCert}, app);
const io = socketIO(expressServer)

expressServer.listen(8181);

const offers = {

};

socketIO.on('connection', (socket) => {
    console.log(`Connection established on Socket ${socket}`);

    socket.on('newOffer', () => {

    });
});