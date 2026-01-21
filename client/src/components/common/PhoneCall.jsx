import React, { useEffect, useState, useRef } from 'react';
import JsSIP from 'jssip';
import api from '../../services/api';
import './PhoneCall.css';

const PhoneCall = ({ phoneNumber, leadId, onClose, onNoteSaved }) => {
    const [callStatus, setCallStatus] = useState('connecting');
    const [callDuration, setCallDuration] = useState(0);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [statuses, setStatuses] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('');
    const sessionRef = useRef(null);
    const uaRef = useRef(null);
    const timerRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const callStartTimeRef = useRef(null);

    // Fetch statuses on mount
    useEffect(() => {
        const fetchStatuses = async () => {
            try {
                const response = await api.getStatuses();
                setStatuses(response.statuses || []);
            } catch (error) {
                console.error('Error fetching statuses:', error);
            }
        };
        fetchStatuses();
    }, []);

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

        // Intercept SDP to prefer PCMU/PCMA over Opus for Telnyx compatibility
        ua.on('newRTCSession', (data) => {
            const session = data.session;

            session.on('peerconnection', (e) => {
                const pc = e.peerconnection;

                // Filter SDP to prefer G.711 codecs
                const filterCodecs = (sdp) => {
                    const lines = sdp.split('\r\n');
                    const filteredLines = [];

                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];

                        // Modify m=audio line to prioritize PCMU (0) and PCMA (8)
                        if (line.startsWith('m=audio')) {
                            const parts = line.split(' ');
                            const port = parts[1];
                            const protocol = parts[2];
                            const payloadTypes = parts.slice(3);

                            // Put PCMU (0) and PCMA (8) first, then other codecs
                            const reorderedPTs = [];
                            if (payloadTypes.includes('0')) reorderedPTs.push('0'); // PCMU
                            if (payloadTypes.includes('8')) reorderedPTs.push('8'); // PCMA
                            payloadTypes.forEach(pt => {
                                if (pt !== '0' && pt !== '8') reorderedPTs.push(pt);
                            });

                            filteredLines.push(`m=audio ${port} ${protocol} ${reorderedPTs.join(' ')}`);
                            continue;
                        }

                        filteredLines.push(line);
                    }

                    return filteredLines.join('\r\n');
                };

                // Intercept createOffer
                const originalCreateOffer = pc.createOffer.bind(pc);
                pc.createOffer = async (options) => {
                    const offer = await originalCreateOffer(options);
                    offer.sdp = filterCodecs(offer.sdp);
                    console.log('Filtered SDP (Offer):', offer.sdp);
                    return offer;
                };

                // Intercept createAnswer
                const originalCreateAnswer = pc.createAnswer.bind(pc);
                pc.createAnswer = async (options) => {
                    const answer = await originalCreateAnswer(options);
                    answer.sdp = filterCodecs(answer.sdp);
                    console.log('Filtered SDP (Answer):', answer.sdp);
                    return answer;
                };
            });
        });

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

        // Set call start time immediately when initiating
        callStartTimeRef.current = Date.now();

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
            // Don't reset callStartTimeRef - it was already set when call was initiated
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

    const saveCallNotes = async () => {
        // Calculate final duration - if call was connected, use callDuration
        // Otherwise, calculate time from call start to now
        let finalDuration = callDuration;

        if (finalDuration === 0 && callStartTimeRef.current) {
            // Call was initiated but not connected, calculate elapsed time
            const elapsedSeconds = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
            finalDuration = elapsedSeconds;
        }

        if (!notes.trim() && finalDuration === 0 && !selectedStatus) {
            return; // Nothing to save
        }

        setIsSaving(true);
        try {
            // Log the call activity
            await api.logActivity({
                type: 'call',
                leadId: leadId,
                duration: finalDuration,
                notes: notes.trim() || `Called ${phoneNumber}`
            });

            // Update lead status if one was selected
            if (selectedStatus && leadId) {
                await api.updateLead(leadId, { status: selectedStatus });
                console.log('Lead status updated to:', selectedStatus);
            }

            // If there are notes and a callback, notify parent
            if (notes.trim() && onNoteSaved) {
                onNoteSaved(notes.trim());
            }

            console.log('Call notes saved successfully');
        } catch (error) {
            console.error('Error saving call notes:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleHangup = async () => {
        // Save notes and status before closing if there are any
        if ((notes.trim() || callDuration > 0 || selectedStatus) && leadId) {
            await saveCallNotes();
        }

        // Release the dial lock
        if (leadId) {
            try {
                await api.releaseLeadLock(leadId);
                console.log('Lead lock released');
            } catch (error) {
                console.log('Error releasing lock (may already be released):', error.message);
            }
        }

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

                {/* Lead Status Section */}
                <div className="call-status-section">
                    <label htmlFor="lead-status" className="status-label">
                        Set Lead Status
                    </label>
                    <select
                        id="lead-status"
                        className="status-select"
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                        <option value="">-- No Change --</option>
                        {statuses.map(status => (
                            <option
                                key={status.id}
                                value={status.name.toLowerCase().replace(/\s+/g, '_')}
                            >
                                {status.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Call Notes Section */}
                <div className="call-notes-section">
                    <label htmlFor="call-notes" className="notes-label">
                        Call Notes
                    </label>
                    <textarea
                        id="call-notes"
                        className="call-notes-textarea"
                        placeholder="Take notes during the call..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                    />
                    <div className="notes-hint">
                        Notes and status will be saved automatically when you end the call
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
                    <button
                        className="btn-hangup"
                        onClick={handleHangup}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : (callStatus === 'ended' || callStatus === 'failed' ? 'Close' : 'Hang Up')}
                    </button>
                </div>

                <audio ref={remoteAudioRef} autoPlay />
            </div>
        </div>
    );
};

export default PhoneCall;
