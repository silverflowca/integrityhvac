import React, { useEffect, useState, useRef } from 'react';
import JsSIP from 'jssip';
import './PhoneCall.css';

const PhoneCall = ({ phoneNumber, onClose }) => {
    const [callStatus, setCallStatus] = useState('connecting');
    const [callDuration, setCallDuration] = useState(0);
    const sessionRef = useRef(null);
    const uaRef = useRef(null);
    const timerRef = useRef(null);
    const remoteAudioRef = useRef(null);

    // Load SIP configuration from localStorage or use defaults
    const getSipConfig = () => {
        const savedSettings = localStorage.getItem('sipSettings');
        if (savedSettings) {
            return JSON.parse(savedSettings);
        }
        return {
            extension: '7828305146',
            password: '5146',
            sipServer: 'avr.silverflow.ca'
        };
    };

    useEffect(() => {
        // Initialize JsSIP
        const SIP_CONFIG = getSipConfig();
        console.log('Using SIP Config:', { server: SIP_CONFIG.sipServer, extension: SIP_CONFIG.extension });
        const socket = new JsSIP.WebSocketInterface(`wss://${SIP_CONFIG.sipServer}/ws`);
        const configuration = {
            sockets: [socket],
            uri: `sip:${SIP_CONFIG.extension}@${SIP_CONFIG.sipServer}`,
            password: SIP_CONFIG.password,
            register: true,
            session_timers: false
        };

        const ua = new JsSIP.UA(configuration);
        uaRef.current = ua;

        ua.on('connected', () => {
            console.log('WebSocket connected');
        });

        ua.on('disconnected', () => {
            console.error('WebSocket disconnected');
        });

        ua.on('registered', () => {
            console.log('SIP registered successfully');
        });

        ua.on('registrationFailed', (e) => {
            console.error('SIP registration failed:', e);
        });

        ua.start();

        // Call immediately after starting
        initiateCall();

        return () => {
            if (sessionRef.current) {
                sessionRef.current.terminate();
            }
            if (uaRef.current) {
                uaRef.current.stop();
            }
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const initiateCall = () => {
        if (!uaRef.current) return;

        const SIP_CONFIG = getSipConfig();
        // Clean phone number - remove non-digits
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        const target = `sip:${cleanNumber}@${SIP_CONFIG.sipServer}`;
        console.log(target,cleanNumber)
        // Use the exact same simple options as the working example
        const options = {
            mediaConstraints: { audio: true, video: false },
            rtcOfferConstraints: { offerToReceiveAudio: 1 }
        };

        const session = uaRef.current.call(target, options);
        sessionRef.current = session;

        // Log the SDP to see what's being sent
        session.on('sdp', (data) => {
            console.log('SDP event:', data.type);
            console.log('SDP content:', data.sdp);
        });

        session.on('connecting', () => {
            console.log('Call connecting...');
            setCallStatus('connecting');
        });

        session.on('progress', () => {
            console.log('Call in progress...');
            setCallStatus('ringing');
        });

        session.on('accepted', () => {
            console.log('Call accepted');
            setCallStatus('connected');
            startTimer();
        });

        session.on('ended', () => {
            console.log('Call ended');
            setCallStatus('ended');
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        });

        session.on('failed', (e) => {
            console.error('Call failed:', e);
            setCallStatus('failed');
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        });

        // Use direct ontrack assignment like the working example
        session.connection.ontrack = (event) => {
            console.log('Track event received:', event);
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
                console.log('Remote audio stream set');
            }
        };
    };

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleHangup = () => {
        // Stop the timer first
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        // Terminate the active session if it's still in progress
        if (sessionRef.current) {
            try {
                const session = sessionRef.current;
                if (session.isInProgress() || session.isEstablished()) {
                    session.terminate();
                }
            } catch (error) {
                console.log('Session already terminated:', error.message);
            }
            sessionRef.current = null;
        }

        // Stop the User Agent
        if (uaRef.current) {
            try {
                uaRef.current.stop();
            } catch (error) {
                console.log('UA stop error:', error.message);
            }
            uaRef.current = null;
        }

        // Close the modal and return to main screen
        setTimeout(() => {
            onClose();
        }, 100);
    };

    const handleSendDTMF = (digit) => {
        if (sessionRef.current && sessionRef.current.isInProgress()) {
            sessionRef.current.sendDTMF(digit);
            console.log(`Sent DTMF: ${digit}`);
        }
    };

    const getStatusIcon = () => {
        switch (callStatus) {
            case 'connecting':
                return '⏳';
            case 'ringing':
                return '📞';
            case 'connected':
                return '🟢';
            case 'ended':
                return '✅';
            case 'failed':
                return '❌';
            default:
                return '📞';
        }
    };

    const getStatusText = () => {
        switch (callStatus) {
            case 'connecting':
                return 'Connecting...';
            case 'ringing':
                return 'Ringing...';
            case 'connected':
                return 'Connected';
            case 'ended':
                return 'Call Ended';
            case 'failed':
                return 'Call Failed';
            default:
                return 'Unknown';
        }
    };

    return (
        <div className="phone-call-overlay" onClick={handleHangup}>
            <div className="phone-call-modal" onClick={(e) => e.stopPropagation()}>
                <div className="call-header">
                    <div className="call-status-icon">{getStatusIcon()}</div>
                    <div className="call-info">
                        <h3>Calling</h3>
                        <div className="call-number">{phoneNumber}</div>
                        <div className="call-status">{getStatusText()}</div>
                        {callStatus === 'connected' && (
                            <div className="call-duration">{formatDuration(callDuration)}</div>
                        )}
                    </div>
                </div>

                {callStatus === 'connected' && (
                    <div className="dtmf-pad">
                        <div className="dtmf-title">Dial Pad</div>
                        <div className="dtmf-grid">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                                <button
                                    key={digit}
                                    className="dtmf-button"
                                    onClick={() => handleSendDTMF(digit)}
                                >
                                    {digit}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="call-actions">
                    <button className="btn-hangup" onClick={handleHangup}>
                        {callStatus === 'ended' || callStatus === 'failed' ? 'Close' : 'Hang Up'}
                    </button>
                </div>

                <audio ref={remoteAudioRef} autoPlay />
            </div>
        </div>
    );
};

export default PhoneCall;
