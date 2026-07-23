const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const app = express();

app.use(express.static(__dirname));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }

    next();
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

const expressServer = http.createServer(app);

const io = socketIO(expressServer, {
    cors: {
        origin: '*'
    }
});

expressServer.listen(8181, () => {
    console.log('Listening on port 8181');
});

const offers = [];
const connectedSockets = [];

io.on('connection', (socket) => {
    console.log(`Connection established`);

    const userName = socket.handshake.auth.userName;
    const password = socket.handshake.auth.password;

    if(password !== "x"){
        socket.disconnect(true);
        return;
    }

    connectedSockets.push({
        socketId: socket.id,
        userName
    });

    if(offers.length){
        socket.emit('availableOffers',offers);
    }

    socket.on('newOffer', (newOffer) => {
        offers.push({
            offererUserName: userName,
            offer: newOffer,
            offerIceCandidates: [],
            answererUserName: null,
            answer: null,
            answererIceCandidates: []
        });

        socket.broadcast.emit('newOfferAwaiting',offers.slice(-1));
    });

    socket.on('newAnswer', (offerObj, ackFunction) => {
        const socketToAnswer = connectedSockets.find(socket => socket.userName === offerObj.offererUserName);

        if(!socketToAnswer){
            console.log("No matching socket")
            return;
        }

        const socketIdToAnswer = socketToAnswer.socketId;
        
        const offerToUpdate = offers.find(offer => offer.offererUserName === offerObj.offererUserName);

        if(!offerToUpdate){
            console.log("No OfferToUpdate")
            return;
        };

        ackFunction(offerToUpdate.offerIceCandidates);
        offerToUpdate.answer = offerObj.answer;
        offerToUpdate.answererUserName = userName;

        socket.to(socketIdToAnswer).emit('answerResponse',offerToUpdate);
    });

    socket.on('sendIceCandidateToSignalingServer', (iceCandidateObj) => {
        const { didIOffer, iceUserName, iceCandidate } = iceCandidateObj;

        if(didIOffer) {
            const offerInOffers = offers.find(offer => offer.offererUserName === iceUserName);

            if(offerInOffers){
                offerInOffers.offerIceCandidates.push(iceCandidate)

                if(offerInOffers.answererUserName){
                    const socketToSendTo = connectedSockets.find(socket => socket.userName === offerInOffers.answererUserName);

                    if(socketToSendTo){
                        socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer',iceCandidate);
                    } else {
                        console.log("Ice candidate recieved but could not find answer");
                    }
                }
            }
        } else {
            const offerInOffers = offers.find(offer => offer.answererUserName === iceUserName);
            const socketToSendTo = connectedSockets.find(socket => socket.userName === offerInOffers.offererUserName);

            if(socketToSendTo) {
                socket.to(socketToSendTo.socketId).emit('receivedIceCandidateFromServer',iceCandidate);
            } else {
                console.log("Ice candidate recieved but could not find offerer");
            }
        }
    });
});