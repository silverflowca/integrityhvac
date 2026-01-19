import React, { useState, useEffect } from 'react';
import './Settings.css';
import CSVImport from '../admin/CSVImport';

const Settings = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('sip');
    const [settings, setSettings] = useState({
        sipServer: 'avr.silverflow.ca',
        extension: '7823582100',
        password: '30222100'
    });
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem('sipSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
        setIsSaved(false);
    };

    const handleSave = () => {
        localStorage.setItem('sipSettings', JSON.stringify(settings));
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
        }, 2000);
    };

    const handleReset = () => {
        const defaultSettings = {
            sipServer: 'avr.silverflow.ca',
            extension: '7823582100',
            password: '30222100'
        };
        setSettings(defaultSettings);
        localStorage.setItem('sipSettings', JSON.stringify(defaultSettings));
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
        }, 2000);
    };

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>Settings & Admin</h2>
                    <button className="btn-close" onClick={onClose}>✕</button>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'sip' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sip')}
                    >
                        SIP Settings
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'import' ? 'active' : ''}`}
                        onClick={() => setActiveTab('import')}
                    >
                        Import Contacts
                    </button>
                </div>

                <div className="settings-content">{activeTab === 'sip' ? (
                    <>
                    <div className="settings-section">
                        <div className="form-group">
                            <label htmlFor="sipServer">SIP Server URL</label>
                            <input
                                type="text"
                                id="sipServer"
                                name="sipServer"
                                value={settings.sipServer}
                                onChange={handleChange}
                                placeholder="avr.silverflow.ca"
                            />
                            <small>WebSocket server address (without wss:// or /ws)</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="extension">Extension / Username</label>
                            <input
                                type="text"
                                id="extension"
                                name="extension"
                                value={settings.extension}
                                onChange={handleChange}
                                placeholder="1002"
                            />
                            <small>Your SIP extension number</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={settings.password}
                                onChange={handleChange}
                                placeholder="Enter password"
                            />
                            <small>SIP account password</small>
                        </div>
                    </div>

                    {isSaved && (
                        <div className="save-notification">
                            ✓ Settings saved successfully!
                        </div>
                    )}

                    <div className="settings-actions">
                        <button className="btn-reset" onClick={handleReset}>
                            Reset to Defaults
                        </button>
                        <button className="btn-save" onClick={handleSave}>
                            Save Settings
                        </button>
                    </div>

                    <div className="settings-info">
                        <strong>Note:</strong> You'll need to restart any active calls for new settings to take effect.
                    </div>
                    </>
                ) : (
                    <CSVImport />
                )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
