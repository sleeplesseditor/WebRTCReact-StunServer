import * as React from 'react';
import { type Socket } from 'socket.io-client';
import CallButtonsBar from '@components/CallButtons/CallButtonsBar';
import VideoContainer from '@components/Video/VideoContainer';
import { devPassword, devUserName, peerConfiguration } from '@helpers/socketHelpers';
import socketConnection from '@helpers/socket';
import './App.scss';

function App() {
  const localVideoRef = React.useRef<HTMLVideoElement | null>(null);
  const remotevideoRef = React.useRef<HTMLVideoElement | null>(null);
  const [peerConnection, setPeerConnection] = React.useState<RTCPeerConnection | null>(null);
  const [activeSocket, setActiveSocket] = React.useState<Socket | null>(null);

  const didIOfferRef = React.useRef(false);

  // let activeSocket: Socket | undefined;
  // let isMounted = true;
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

  console.log('didIOffer', didIOfferRef.current)

  const createPeerConnection = (offerObj: any) => {
    return new Promise<RTCPeerConnection>(async (resolve, reject) => {
      try {
        console.log('CALLED');
        const connection = new RTCPeerConnection(peerConfiguration);
        remoteStream = new MediaStream();

        setPeerConnection(connection);

        if (remotevideoRef.current) {
          console.log('remotevideoRef', remoteStream)
          remotevideoRef.current.srcObject = remoteStream;
        }

        console.log('PEER didIOffer', didIOfferRef.current);

        localStream.getTracks().forEach((track: any) => {
          connection.addTrack(track, localStream);
        });

        connection.addEventListener('icecandidate', (e: any) => {
          console.log('........Ice candidate found!......');
          console.log(e);
          if (e.candidate && activeSocket) {
            activeSocket.emit('sendIceCandidateToSignalingServer', {
              iceCandidate: e.candidate,
              iceUserName: devUserName,
              didIOffer: didIOfferRef.current,
            });
          }
        });

        connection.addEventListener('track', (e: any) => {
          console.log('Got a track from the other peer!! How excting');
          console.log(e);
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
    // const connect = async () => {
    //   try {
    //     socketConnection().then((connectedSocket) => {
    //       if (isMounted) setActiveSocket(connectedSocket);
    //     });

    //     if (!isMounted || !activeSocket) {
    //       return;
    //     }
    //   } catch (error) {
    //     console.error('Socket connection failed:', error);
    //   }
    // };

    // void connect();
  let isMounted = true;

    socketConnection().then((connectedSocket) => {
      console.log('then', isMounted)
      if (isMounted) setActiveSocket(connectedSocket);
      console.log('ac', activeSocket)
    });

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, []);

  console.log('PEER', activeSocket, peerConnection)

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        {activeSocket ? <CallButtonsBar
          createPeerConnection={createPeerConnection}
          didIOffer={didIOfferRef}
          fetchUserMedia={fetchUserMedia}
          peerConnection={peerConnection}
          socketConnection={activeSocket}
        /> : null}
      </div>
      <div className="rtc-container__videos">
        <VideoContainer videoId='local-video' videoRef={localVideoRef} />
        <VideoContainer videoId='remote-video' videoRef={remotevideoRef} />
      </div>
    </div>
  )
}

export default App
