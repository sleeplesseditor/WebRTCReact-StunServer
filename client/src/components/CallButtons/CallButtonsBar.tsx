import * as React from 'react';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';

interface ICallButtonsProps {
    createPeerConnection: (obj?: any) => Promise<any>;
    didIOffer: any;
    fetchUserMedia: any;
    peerConnection: any;
    peerConnectionRef: React.MutableRefObject<RTCPeerConnection | null>;
    socketConnection: any;
    userName: string;
}

const CallButtonsBar = (props: ICallButtonsProps) => {
    const [availableOffers, setAvailableOffers] = React.useState([]);
    const pendingRemoteCandidatesRef = React.useRef<any[]>([]);

    const callUser = async () => {
        console.log('callUser invoked');
        await props.fetchUserMedia();

        props.didIOffer.current = true;
        const connection = await props.createPeerConnection();

        if (connection) {
            try {
                console.log('Creating offer...');
                const offer = await connection.createOffer();
                await connection.setLocalDescription(offer);

                const offerPayload = offer.toJSON ? offer.toJSON() : offer;
                console.log('Emitting offer', offerPayload);
                props.socketConnection.emit('newOffer', offerPayload);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const answerCall = async(offerObj: any) => {
        console.log('answerCall invoked', offerObj);
        props.didIOffer.current = false;
        await props.fetchUserMedia();
        const connection = await props.createPeerConnection(offerObj);
        console.log('Creating answer for offer', offerObj);
        const answer = await connection.createAnswer({});
        await connection.setLocalDescription(answer);

        const answerPayload = answer.toJSON ? answer.toJSON() : answer;
        offerObj.answer = answerPayload;
        console.log('Sending answer', offerObj);
        const offerIceCandidates = await props.socketConnection.emitWithAck('newAnswer', offerObj);
        console.log('Answer ack candidates', offerIceCandidates);
        if (Array.isArray(offerIceCandidates)) {
            for (const candidate of offerIceCandidates) {
                try {
                    await connection.addIceCandidate(candidate);
                    console.log('======Added Ice Candidate======');
                } catch (candidateError) {
                    console.error('Failed to add candidate from answer ack', candidateError);
                }
            }
        }
    }

    const addAnswer = async(offerObj: any) => {
        const connection = props.peerConnectionRef.current ?? props.peerConnection;
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
        const connection = props.peerConnectionRef.current ?? props.peerConnection;
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
        if (!props.socketConnection) return;

        const socket = props.socketConnection;

        const handleAvailableOffers = (offers: any) => {
            console.log(offers);
            setAvailableOffers(offers);
        };

        const handleNewOfferAwaiting = (offers: any) => {
            setAvailableOffers(offers);
        };

        const handleAnswerResponse = (offerObj: any) => {
            console.log('answerResponse received', offerObj);
            void addAnswer(offerObj);
        };

        const handleIceCandidate = (iceCandidate: any) => {
            console.log('receivedIceCandidateFromServer', iceCandidate);
            void addNewIceCandidate(iceCandidate);
        };

        socket.on('availableOffers', handleAvailableOffers);
        socket.on('newOfferAwaiting', handleNewOfferAwaiting);
        socket.on('answerResponse', handleAnswerResponse);
        socket.on('receivedIceCandidateFromServer', handleIceCandidate);

        return () => {
            socket.off('availableOffers', handleAvailableOffers);
            socket.off('newOfferAwaiting', handleNewOfferAwaiting);
            socket.off('answerResponse', handleAnswerResponse);
            socket.off('receivedIceCandidateFromServer', handleIceCandidate);
        };
    }, [props.peerConnection, props.socketConnection]);

    const renderOfferButtons = (availableOffersArr: any) => 
        availableOffersArr.map(( offer: any ) => {
            return (
                <Button
                    color='success'
                    onClick={() => answerCall(offer)}
                    startIcon={<LocalPhoneIcon />}
                    variant="contained"
                >
                    Answer {offer.offererUserName}
                </Button>
            )
    });
    
    return (
        <Box sx={{ flexGrow: 1 }}>
            <span>{props.userName}</span>
            <ButtonGroup>
                <Button 
                    color="success"
                    onClick={() => callUser()}
                    startIcon={<PhoneForwardedIcon />}
                    variant="contained"
                >
                    Call
                </Button>
            </ButtonGroup>
            {availableOffers && availableOffers.length >= 0 ? (
                <ButtonGroup>
                    {renderOfferButtons(availableOffers)}
                </ButtonGroup>
            ) : null}
        </Box>
    )
};

export default CallButtonsBar;