let peerConfiguration = {
    iceServers:[
        {
            urls:[
              'stun:stun.l.google.com:19302',
              'stun:stun1.l.google.com:19302'
            ]
        }
    ]
}

const devUserName = `Josh-${Math.floor(Math.random() * 100000)}`;
const devPassword = 'x';

export {
    devUserName,
    devPassword,
    peerConfiguration,
}