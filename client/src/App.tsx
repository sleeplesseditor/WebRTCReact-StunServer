import * as React from 'react';
import { type Socket } from 'socket.io-client';
import CallButtonsBar from '@components/CallButtons/CallButtonsBar';
import VideoContainer from '@components/Video/VideoContainer';
import { devUserName, peerConfiguration } from '@helpers/socketHelpers';
import socketConnection from '@helpers/socket';
import './App.scss';

function App() {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [peerConnection, setPeerConnection] = React.useState<RTCPeerConnection | null>(null);
  const [activeSocket, setActiveSocket] = React.useState<Socket | null>(null);

  const didIOfferRef = React.useRef(false);

  let localStream: any; 
  let remoteStream: any;

  const fetchUserMedia = () => {
    return new Promise<void>(async(resolve, reject) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            localStream = stream;    
            resolve();    
        } catch(err) {
            console.error('Fetch User Media Error', err);
            reject();
        }
    })
  };

  const createPeerConnection = (offerObj: any) => {
    return new Promise<RTCPeerConnection>(async (resolve, reject) => {
      try {
        const connection = new RTCPeerConnection(peerConfiguration);
        remoteStream = new MediaStream();

        setPeerConnection(connection);

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }

        localStream.getTracks().forEach((track: any) => {
          connection.addTrack(track, localStream);
        });

        connection.addEventListener('icecandidate', (e: any) => {
          if (e.candidate && activeSocket) {
            activeSocket.emit('sendIceCandidateToSignalingServer', {
              iceCandidate: e.candidate,
              iceUserName: devUserName,
              didIOffer: didIOfferRef.current,
            });
          }
        });

        connection.addEventListener('track', (e: any) => {
          console.log('Got a track from the other peer!! How exciting');
          e.streams[0].getTracks().forEach((track: any) => {
            remoteStream.addTrack(track, remoteStream);
            console.log("Here's an exciting moment... fingers cross");
          });
        });

        if (offerObj) {
          await connection.setRemoteDescription(offerObj.offer);
        }

        resolve(connection);
      } catch (error) {
        reject(error);
      }
    });
  };

  React.useEffect(() => {
    let isMounted = true;

    socketConnection().then((connectedSocket) => {
      if (isMounted) setActiveSocket(connectedSocket);
    });

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, []);

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        {activeSocket ? (
          <CallButtonsBar
            createPeerConnection={createPeerConnection}
            didIOffer={didIOfferRef}
            fetchUserMedia={fetchUserMedia}
            peerConnection={peerConnection}
            socketConnection={activeSocket}
          /> 
        ): null}
      </div>
      <div className="rtc-container__videos">
        <VideoContainer videoId='local-video' videoRef={localVideoRef} />
        <VideoContainer videoId='remote-video' videoRef={remoteVideoRef} />
      </div>
    </div>
  )
}

export default App
