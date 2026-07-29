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

  let activeSocket: Socket | undefined;
  let isMounted = true;
  let localStream: any; 
  let remoteStream: any;
  let peerConnection: any;
  let didIOffer = false;

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
    return new Promise<void>(async(resolve, reject) => {
      console.log('CALLED')
        peerConnection = await new RTCPeerConnection(peerConfiguration)
        remoteStream = new MediaStream();

        if(remotevideoRef.current) {
          remotevideoRef.current.srcObject = remoteStream;
        }

        localStream.getTracks().forEach((track: any) => {
            peerConnection.addTrack(track,localStream);
        })

        peerConnection.addEventListener('icecandidate', (e: any) => {
            console.log('........Ice candidate found!......')
            console.log(e)
            if(e.candidate && activeSocket){
                activeSocket.emit('sendIceCandidateToSignalingServer',{
                    iceCandidate: e.candidate,
                    iceUserName: devUserName,
                    didIOffer,
                })    
            }
        })
        
        peerConnection.addEventListener('track', (e: any) =>{
            console.log("Got a track from the other peer!! How excting")
            console.log(e)
            e.streams[0].getTracks().forEach((track: any) => {
                remoteStream.addTrack(track,remoteStream);
                console.log("Here's an exciting moment... fingers cross")
            })
        })

        if(offerObj){
            await peerConnection.setRemoteDescription(offerObj.offer)
        }
        resolve();
    })
  };


  React.useEffect(() => {
    const connect = async () => {
      try {
        activeSocket = await socketConnection();

        if (!isMounted || !activeSocket) {
          return;
        }
      } catch (error) {
        console.error('Socket connection failed:', error);
      }
    };

    void connect();

    return () => {
      isMounted = false;
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, []);

  console.log('PEER', peerConnection)

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        <CallButtonsBar 
          createPeerConnection={createPeerConnection}
          didIOffer={didIOffer} 
          fetchUserMedia={fetchUserMedia} 
          peerConnection={peerConnection} 
          socketConnection={activeSocket} 
        />
      </div>
      <div className="rtc-container__videos">
        <VideoContainer videoId='local-video' videoRef={localVideoRef} />
        <VideoContainer videoId='remote-video' videoRef={remotevideoRef} />
      </div>
    </div>
  )
}

export default App
