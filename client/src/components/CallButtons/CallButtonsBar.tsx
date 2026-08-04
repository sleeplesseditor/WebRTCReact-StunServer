import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';

interface ICallButtonsProps {
    availableOffers: any;
    createPeerConnection: (obj?: any) => Promise<any>;
    didIOffer: any;
    fetchUserMedia: any;
    socketConnection: any;
    userName: string;
}

const CallButtonsBar = (props: ICallButtonsProps) => {
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
        const updatedOfferObj = {
            ...offerObj,
            answer: answerPayload
        }

        console.log('Sending answer', updatedOfferObj);
        const offerIceCandidates = await props.socketConnection.emitWithAck('newAnswer', updatedOfferObj);
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
        <Box className="call-buttons-bar" sx={{ flexGrow: 1 }}>
            <div className="call-buttons-bar__content">
                <span className="call-buttons-bar__id">User ID: {props.userName}</span>
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
                {props.availableOffers && props.availableOffers.length > 0 ? (
                    <ButtonGroup>
                        {renderOfferButtons(props.availableOffers)}
                    </ButtonGroup>
                ) : null}
            </div>
        </Box>
    )
};

export default CallButtonsBar;