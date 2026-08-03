import * as React from 'react';
import Card from '@mui/material/Card';

interface IVideoProps {
    videoId: string;
}

const VideoContainer = React.forwardRef<HTMLVideoElement, IVideoProps>(function VideoContainerInner(props, ref) {
    return (
        <Card className="video-card">
            <video
                autoPlay
                className="video-player"
                controls
                id={props.videoId}
                playsInline
                ref={ref}
            />
        </Card>
    )
});

VideoContainer.displayName = 'VideoContainer';

export default VideoContainer;