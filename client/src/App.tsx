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
  const [remoteStreamReady, setRemoteStreamReady] = React.useState(false);

  const didIOfferRef = React.useRef(false);
  const localStreamRef = React.useRef<MediaStream | null>(null);
  const remoteStreamRef = React.useRef<MediaStream | null>(null);
  const activeSocketRef = React.useRef<Socket | null>(null);
  const peerConnectionRef = React.useRef<RTCPeerConnection | null>(null);
  const hasUserGestureRef = React.useRef(false);

  const rtcLog = React.useCallback((message: string, ...args: unknown[]) => {
    console.log(message, ...args);
    if (typeof window !== 'undefined') {
      const targetWindow = window as Window & { __rtcLogs?: unknown[][] };
      const logs = targetWindow.__rtcLogs ?? [];
      logs.push([message, ...args]);
      targetWindow.__rtcLogs = logs;
    }
  }, []);

  const startRemotePlayback = React.useCallback(() => {
    const video = remoteVideoRef.current;
    console.log('VIDEO REF', video);
    if (!video) {
      return;
    }

    if (!hasUserGestureRef.current) {
      hasUserGestureRef.current = true;
    }

    const stream = video.srcObject;
    const hasLiveTracks = stream instanceof MediaStream && stream.getTracks().some((track) => track.readyState === 'live');
       console.log('hasLiveTracks', hasLiveTracks)

    if (!hasLiveTracks) {
      return;
    }


    void video.play().catch((error: unknown) => {
      console.error('Remote video playback failed', error);
    });
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
            setRemoteStreamReady(true);
            rtcLog('assigned remote stream to video element', streamToShow.id);
            if (hasUserGestureRef.current) {
              startRemotePlayback();
            }
          }
        });

        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track: MediaStreamTrack) => {
            connection.addTrack(track, localStreamRef.current as MediaStream);
          });
        }

        connection.addEventListener('icecandidate', (e: any) => {
          const socket = activeSocketRef.current;
          rtcLog('icecandidate generated', e.candidate?.candidate ?? null);
          if (e.candidate && socket) {
            socket.emit('sendIceCandidateToSignalingServer', {
              iceCandidate: e.candidate,
              iceUserName: devUserName,
              didIOffer: didIOfferRef.current,
            });
          }
        });

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

  React.useEffect(() => {
    const handleUserGesture = () => {
      hasUserGestureRef.current = true;
      startRemotePlayback();
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
    };

    window.addEventListener('click', handleUserGesture);
    window.addEventListener('touchstart', handleUserGesture);

    let isMounted = true;

    socketConnection(devUserName).then((connectedSocket) => {
      if (isMounted) {
        activeSocketRef.current = connectedSocket;
        setActiveSocket(connectedSocket);
      }
    });

    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchstart', handleUserGesture);
      isMounted = false;
      if (activeSocketRef.current) {
        activeSocketRef.current.disconnect();
        activeSocketRef.current = null;
      }
    };
  }, []);

  React.useEffect(() => {
    if (remoteStreamReady && hasUserGestureRef.current) {
      startRemotePlayback();
    }
  }, [remoteStreamReady, startRemotePlayback]);

  console.log('remoteVideoRef', remoteVideoRef?.current?.srcObject)

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        {activeSocket ? (
          <CallButtonsBar
            createPeerConnection={createPeerConnection}
            didIOffer={didIOfferRef}
            fetchUserMedia={fetchUserMedia}
            peerConnection={peerConnection}
            peerConnectionRef={peerConnectionRef}
            socketConnection={activeSocket}
            userName={devUserName}
          /> 
        ): null}
      </div>
      <div className="rtc-container__videos">
        <VideoContainer ref={localVideoRef} videoId='local-video' />
        <VideoContainer ref={remoteVideoRef} videoId='remote-video' />
        {remoteStreamReady ? (
          <button type="button" onClick={startRemotePlayback}>
            Play remote video
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default App
