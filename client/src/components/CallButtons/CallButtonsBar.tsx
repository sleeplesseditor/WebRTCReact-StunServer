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
    socketConnection: any;
}

const CallButtonsBar = (props: ICallButtonsProps) => {
    console.log('PROPS', props)
    const [availableOffers, setAvailableOffers] = React.useState([]);

    const callUser = async () => {
        await props.fetchUserMedia();

        const connection = await props.createPeerConnection();

        console.log('CONNECTION', props.socketConnection)

        if (connection) {
            try {
                console.log('Creating offer...');
                const offer = await connection.createOffer();
                console.log('OFF', offer);
                props.didIOffer.current = true;
                await connection.setLocalDescription(offer);

                props.socketConnection.emit('newOffer', offer);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const answerCall = async(offerObj: any) => {
        await props.fetchUserMedia();
        const connection = await props.createPeerConnection(offerObj);
        const answer = await connection.createAnswer({});
        await connection.setLocalDescription(answer);

        offerObj.answer = answer;
        const offerIceCandidates = await props.socketConnection.emitWithAck('newAnswer', offerObj);
        offerIceCandidates.forEach((candidate: any) => {
            connection.addIceCandidate(candidate);
            console.log('======Added Ice Candidate======');
        });
        console.log(offerIceCandidates);
    }

    const addAnswer = async(offerObj: any) => {
        await props.peerConnection.setRemoteDescription(offerObj.answer)
    }

    const addNewIceCandidate = (iceCandidate: any) => {
        props.peerConnection.addIceCandidate(iceCandidate)
    }

    React.useEffect(() => {
        if (!props.socketConnection) return;

        const socket = props.socketConnection;

        socket.on('availableOffers', (offers: any) => {
            console.log(offers);
            setAvailableOffers(offers);
        });

        socket.on('newOfferAwaiting', (offers: any) => {
            setAvailableOffers(offers);
        });

        socket.on('answerResponse', (offerObj: any) => {
            console.log(offerObj);
            addAnswer(offerObj);
        });

        socket.on('receivedIceCandidateFromServer', (iceCandidate: any) => {
            addNewIceCandidate(iceCandidate);
            console.log(iceCandidate);
        });

        return () => {
            socket.off('availableOffers', () => setAvailableOffers([]));
            socket.off('newOfferAwaiting', () => setAvailableOffers([]));
            socket.off('answerResponse', (offerObj: any) => addAnswer(offerObj));
            socket.off('receivedIceCandidateFromServer', (iceCandidate: any) => addNewIceCandidate(iceCandidate));
        };
    }, [props.socketConnection]);

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
    

    console.log('availableOffers', availableOffers.length)

    return (
        <Box sx={{ flexGrow: 1 }}>
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