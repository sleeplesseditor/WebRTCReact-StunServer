import Card from '@mui/material/Card';

interface IVideoProps {
    videoId: string;
    videoRef: any;
}

const VideoContainer = (props: IVideoProps) => {
    return (
        <Card className="video-card">
            <video 
                autoPlay
                className="video-player"
                controls
                id={props.videoId}
                playsInline
                ref={props.videoRef}
            />
        </Card>
    )
};

export default VideoContainer;