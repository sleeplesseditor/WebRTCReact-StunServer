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
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);

  const [availableOffers, setAvailableOffers] = React.useState([]);
  const pendingRemoteCandidatesRef = React.useRef<any[]>([]);
  

  const rtcLog = React.useCallback((message: string, ...args: unknown[]) => {
    console.log(message, ...args);
    if (typeof window !== 'undefined') {
      const targetWindow = window as Window & { __rtcLogs?: unknown[][] };
      const logs = targetWindow.__rtcLogs ?? [];
      logs.push([message, ...args]);
      targetWindow.__rtcLogs = logs;
    }
  }, []);

  const fetchUserMedia = () => {
    return new Promise<void>(async(resolve, reject) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
            });

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
            localStreamRef.current = stream;
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
        const remoteStream = new MediaStream();
        remoteStreamRef.current = remoteStream;

        setPeerConnection(connection);
        peerConnectionRef.current = connection;

        connection.addEventListener('icecandidate', (e: any) => {
          rtcLog('icecandidate generated', e.candidate?.candidate ?? null);
          if (e.candidate && activeSocket) {
            activeSocket.emit('sendIceCandidateToSignalingServer', {
              iceCandidate: e.candidate,
              iceUserName: devUserName,
              didIOffer: didIOfferRef.current,
            });
          }
        });

        connection.addEventListener('track', (e: RTCTrackEvent) => {
          const remoteTrack = e.track;
          const incomingStream = e.streams?.[0];

          rtcLog('track event', remoteTrack?.kind, incomingStream?.id, e.streams?.length ?? 0);

          if (!remoteTrack) {
            return;
          }

          const streamToShow = incomingStream ?? new MediaStream([remoteTrack]);
          remoteStreamRef.current = streamToShow;

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = streamToShow;
            rtcLog('assigned remote stream to video element', streamToShow.id);
          }
        });

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
            connection.addTrack(track, localStreamRef.current as MediaStream);
          });
        }

        connection.addEventListener('connectionstatechange', () => {
          rtcLog('connection state', connection.connectionState);
        });

        connection.addEventListener('iceconnectionstatechange', () => {
          rtcLog('ice connection state', connection.iceConnectionState);
        });

        connection.addEventListener('signalingstatechange', () => {
          rtcLog('signaling state', connection.signalingState);
        });

        if (offerObj) {
          const remoteDescription = offerObj.offer
            ? new RTCSessionDescription(offerObj.offer)
            : null;

          if (remoteDescription) {
            await connection.setRemoteDescription(remoteDescription);
          }
        }

        resolve(connection);
      } catch (error) {
        reject(error);
      }
    });
  };

    const addAnswer = async(offerObj: any) => {
        const connection = peerConnectionRef.current ?? peerConnection;
        if (!connection) return;
        const remoteDescription = offerObj.answer
            ? new RTCSessionDescription(offerObj.answer)
            : null;

        if (remoteDescription) {
            console.log('Applying remote description', remoteDescription);
            await connection.setRemoteDescription(remoteDescription);

            if (pendingRemoteCandidatesRef.current.length > 0) {
                console.log('Draining pending remote ICE candidates', pendingRemoteCandidatesRef.current.length);
                for (const candidate of pendingRemoteCandidatesRef.current) {
                    await connection.addIceCandidate(candidate);
                }
                pendingRemoteCandidatesRef.current = [];
            }
        }
    }

    const addNewIceCandidate = async(iceCandidate: any) => {
        const connection = peerConnectionRef.current ?? peerConnection;
        if (!connection) return;
        console.log('Adding ICE candidate', iceCandidate);

        if (!connection.remoteDescription || !connection.remoteDescription.type) {
            pendingRemoteCandidatesRef.current.push(iceCandidate);
            console.log('Queued ICE candidate until remote description is set');
            return;
        }

        await connection.addIceCandidate(iceCandidate);
    }

    React.useEffect(() => {
      setAvailableOffers([]);

      let isMounted = true;

      socketConnection(devUserName).then((connectedSocket) => {
        if (isMounted) {
          setActiveSocket(connectedSocket);
        }

        function handleAvailableOffers(offers: any){
            console.log('handleAvailableOffers', offers);
            setAvailableOffers(offers);
        };

        function handleNewOfferAwaiting(offers: any){
            console.log('handleNewOfferAwaiting', offers);
            setAvailableOffers(offers);
        };

        function handleAnswerResponse(offerObj: any){
            console.log('answerResponse received', offerObj);
            void addAnswer(offerObj);
        };

        function handleIceCandidate(iceCandidate: any){
            console.log('receivedIceCandidateFromServer', iceCandidate);
            void addNewIceCandidate(iceCandidate);
        };

        connectedSocket?.on('availableOffers', handleAvailableOffers);
        connectedSocket?.on('newOfferAwaiting', handleNewOfferAwaiting);
        connectedSocket?.on('answerResponse', handleAnswerResponse);
        connectedSocket?.on('receivedIceCandidateFromServer', handleIceCandidate);

        });


        return () => {
            isMounted = false;

            if (activeSocket) {
              activeSocket.disconnect();
              setActiveSocket(null);
            }
        };
    }, []);

    console.log('AV', availableOffers)

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        {activeSocket ? (
          <CallButtonsBar
            availableOffers={availableOffers}
            createPeerConnection={createPeerConnection}
            didIOffer={didIOfferRef}
            fetchUserMedia={fetchUserMedia}
            socketConnection={activeSocket}
            userName={devUserName}
          /> 
        ): null}
      </div>
      <div className="rtc-container__videos">
        <VideoContainer ref={localVideoRef} videoId='local-video' />
        <VideoContainer ref={remoteVideoRef} videoId='remote-video' />
      </div>
    </div>
  )
}

export default App
