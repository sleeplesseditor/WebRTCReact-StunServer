import * as React from 'react';
import Box from '@mui/material/Box';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import PhoneForwardedIcon from '@mui/icons-material/PhoneForwarded';

interface ICallButtonsProps {
    createPeerConnection: (obj?: any) => void;
    didIOffer: boolean;
    fetchUserMedia: any;
    peerConnection: any;
    socketConnection: any;
}

const CallButtonsBar = (props: ICallButtonsProps) => {
    const [availableOffers, setAvailableOffers] = React.useState({});

    const callUser = async () => {
        await props.fetchUserMedia();
        await props.createPeerConnection();

        try{
            console.log("Creating offer...")
            const offer = await props.peerConnection.createOffer();
            console.log(offer);

            props.peerConnection.setLocalDescription(offer);
            props.didIOffer = true;
            props.socketConnection.emit('newOffer', offer); 
        } catch(err){
            console.log(err)
        }
    }

    const answerCall = async(offerObj: any)=>{
        await props.fetchUserMedia()
        await props.createPeerConnection(offerObj);
        const answer = await props.peerConnection.createAnswer({});
        await props.peerConnection.setLocalDescription(answer); 

        offerObj.answer = answer;
        const offerIceCandidates = await props.socketConnection.emitWithAck('newAnswer', offerObj);
        offerIceCandidates.forEach((candidate: any) => {
            props.peerConnection.addIceCandidate(candidate);
            console.log("======Added Ice Candidate======")
        })
        console.log(offerIceCandidates)
    }

    const addAnswer = async(offerObj: any) => {
        await props.peerConnection.setRemoteDescription(offerObj.answer)
    }

    const addNewIceCandidate = (iceCandidate: any) => {
        props.peerConnection.addIceCandidate(iceCandidate)
    }

    React.useEffect(() => {
        props.socketConnection.on('availableOffers', (offers: any) => {
            console.log(offers)
            setAvailableOffers(offers)
        })

        props.socketConnection.on('newOfferAwaiting', (offers: any) => {
            setAvailableOffers(offers)
        })

        props.socketConnection.on('answerResponse', (offerObj: any) => {
            console.log(offerObj)
            addAnswer(offerObj)
        })

        props.socketConnection.on('receivedIceCandidateFromServer', (iceCandidate: any) => {
            addNewIceCandidate(iceCandidate)
            console.log(iceCandidate)
        })
    }, [props.socketConnection]);

    const renderOfferButtons = (availableOffersArr: any) => 
        availableOffersArr.forEach(( offer: any ) => {
            return (
                <Button
                    color='success'
                    onClick={() => answerCall(offer)}
                    startIcon={<LocalPhoneIcon />}
                    variant="contained"
                >
                    Answer {offer.offereruserName}
                </Button>
            )
        })
    

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
            {Object.keys(availableOffers).length > 0 ? (
                <ButtonGroup>
                    {renderOfferButtons(availableOffers)}
                </ButtonGroup>
            ) : null}
        </Box>
    )
};

export default CallButtonsBar;