import CallButtonsBar from '@components/CallButtons/CallButtonsBar';
import VideoContainer from '@components/Video/VideoContainer';
import './App.scss';

function App() {

  return (
    <div className="rtc-container">
      <div className="rtc-container__buttons">
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
