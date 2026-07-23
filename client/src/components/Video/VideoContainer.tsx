import * as React from 'react';
import Card from '@mui/material/Card';

interface IVideoProps {
    videoId: string;
}

const VideoContainer = (props: IVideoProps) => {
    return (
        <Card className="video-card" sx={{ minWidth: 275 }}>
            <video 
                autoPlay
                className="video-player"
                controls
                id={props.videoId}
                playsInline
            />
        </Card>
    )
};

export default VideoContainer;