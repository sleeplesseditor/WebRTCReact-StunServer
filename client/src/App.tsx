import * as React from 'react';
import { type Socket } from 'socket.io-client';
import CallButtonsBar from '@components/CallButtons/CallButtonsBar';
import VideoContainer from '@components/Video/VideoContainer';
import socketConnection from '@helpers/socket';
import './App.scss';

function App() {
  const [isConnected, setIsConnected] = React.useState<boolean>(false);

  React.useEffect(() => {
    let activeSocket: Socket | undefined;
    let isMounted = true;

    const connect = async () => {
      try {
        activeSocket = await socketConnection();

        if (!isMounted || !activeSocket) {
          return;
        }

        function onConnect() {
          setIsConnected(true);
        }

        function onDisconnect() {
          setIsConnected(false);
        }

        function onConnectError(error: Error) {
          console.error('Socket connection error:', error.message);
          setIsConnected(false);
        }

        activeSocket.on('connect', onConnect);
        activeSocket.on('disconnect', onDisconnect);
        activeSocket.on('connect_error', onConnectError);

        if (!activeSocket.connected) {
          setIsConnected(false);
        }
      } catch (error) {
        console.error('Socket connection failed:', error);
        if (isMounted) {
          setIsConnected(false);
        }
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

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
        {isConnected ? (<span>Connected</span>) : (<span>Not Connected</span>)}
        <CallButtonsBar />
      </div>
      <div className="rtc-container__videos">
        <VideoContainer videoId='local-video' />
        <VideoContainer videoId='remote-video' />
      </div>
    </div>
  )
}

export default App
