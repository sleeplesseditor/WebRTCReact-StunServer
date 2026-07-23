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

const offers = [];
const connectedSockets = [];

socketIO.on('connection', (socket) => {
    console.log(`Connection established on Socket ${socket}`);

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