import React, { useEffect, useRef, useState } from 'react';
import './LeadMapView.css';

const STATUS_COLORS = {
    new: '#0ea5e9',
    contacted: '#06b6d4',
    qualified: '#8b5cf6',
    quoted: '#f59e0b',
    won: '#10b981',
    lost: '#ef4444'
};

const PRIORITY_COLORS = {
    hot: '#ef4444',
    warm: '#f59e0b',
    cold: '#06b6d4'
};

const LeadMapView = ({ leads, onEditLead, onDeleteLead, onUpdateStatus, onCall }) => {
    const mapRef = useRef(null);
    const [map, setMap] = useState(null);
    const [selectedLead, setSelectedLead] = useState(null);
    const [geocodedLeads, setGeocodedLeads] = useState([]);
    const markersRef = useRef([]);

    // Geocode leads on mount
    useEffect(() => {
        geocodeLeads();
    }, [leads]);

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || map) return;

        // Simple map implementation without external library
        const mapInstance = {
            center: { lat: 43.6532, lng: -79.3832 }, // Toronto default
            zoom: 10
        };
        setMap(mapInstance);
    }, []);

    const geocodeLeads = async () => {
        const geocoded = [];
        for (const lead of leads) {
            if (lead.location) {
                try {
                    const coords = await geocodeAddress(lead.location);
                    if (coords) {
                        geocoded.push({ ...lead, coords });
                    }
                } catch (error) {
                    console.error('Geocoding error for', lead.location, error);
                }
            }
        }
        setGeocodedLeads(geocoded);
    };

    const geocodeAddress = async (address) => {
        try {
            // Use Nominatim (OpenStreetMap) geocoding API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
            );
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
        return null;
    };

    const handleMarkerClick = (lead) => {
        setSelectedLead(lead);
    };

    const handleClosePopup = () => {
        setSelectedLead(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleStatusChange = (leadId, newStatus) => {
        onUpdateStatus(leadId, newStatus);
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
    };

    if (leads.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No leads found</h3>
                <p>Add your first lead to get started</p>
            </div>
        );
    }

    return (
        <div className="map-view-container">
            <div className="map-wrapper" ref={mapRef}>
                {/* Simple grid-based map visualization */}
                <div className="simple-map">
                    <div className="map-header">
                        <h3>📍 Lead Locations Map</h3>
                        <p className="map-info">
                            {geocodedLeads.length} of {leads.length} leads geocoded
                        </p>
                    </div>

                    <div className="map-grid">
                        {geocodedLeads.map((lead) => (
                            <div
                                key={lead.id}
                                className="map-marker"
                                onClick={() => handleMarkerClick(lead)}
                                style={{
                                    borderColor: STATUS_COLORS[lead.status] || '#94a3b8'
                                }}
                            >
                                <div className="marker-icon" style={{
                                    backgroundColor: PRIORITY_COLORS[lead.priority] || '#94a3b8'
                                }}>
                                    📍
                                </div>
                                <div className="marker-label">
                                    {lead.company || lead.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Show leads without location */}
                    {leads.length > geocodedLeads.length && (
                        <div className="unmapped-leads">
                            <h4>Leads without location ({leads.length - geocodedLeads.length})</h4>
                            <div className="unmapped-list">
                                {leads
                                    .filter(lead => !geocodedLeads.find(g => g.id === lead.id))
                                    .map(lead => (
                                        <div key={lead.id} className="unmapped-item">
                                            <span>{lead.company || lead.name}</span>
                                            <button
                                                className="btn-edit-small"
                                                onClick={() => onEditLead(lead)}
                                                title="Add location"
                                            >
                                                ✏️ Add location
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Lead details popup */}
            {selectedLead && (
                <div className="map-popup-overlay" onClick={handleClosePopup}>
                    <div className="map-popup" onClick={(e) => e.stopPropagation()}>
                        <button className="popup-close" onClick={handleClosePopup}>✕</button>

                        <div className="popup-header">
                            <h3>{selectedLead.company || 'No Company'}</h3>
                            <p className="popup-contact">{selectedLead.name || 'No Name'}</p>
                        </div>

                        <div className="popup-details">
                            <div className="popup-detail-item">
                                <span className="detail-icon">📞</span>
                                <span>{selectedLead.phone || 'No phone'}</span>
                                {selectedLead.phone && (
                                    <button
                                        className="btn-call-popup"
                                        onClick={() => onCall(selectedLead.phone)}
                                    >
                                        Call
                                    </button>
                                )}
                            </div>
                            <div className="popup-detail-item">
                                <span className="detail-icon">✉️</span>
                                <span>{selectedLead.email || 'No email'}</span>
                            </div>
                            <div className="popup-detail-item">
                                <span className="detail-icon">📍</span>
                                <span>{selectedLead.location || 'No location'}</span>
                            </div>
                            <div className="popup-detail-item">
                                <span className="detail-icon">📅</span>
                                <span>{formatDate(selectedLead.createdAt)}</span>
                            </div>
                        </div>

                        {selectedLead.notes && (
                            <div className="popup-notes">
                                <strong>Notes:</strong>
                                <p>{selectedLead.notes}</p>
                            </div>
                        )}

                        <div className="popup-footer">
                            <span
                                className="priority-badge"
                                style={{ backgroundColor: PRIORITY_COLORS[selectedLead.priority] || '#94a3b8' }}
                            >
                                {selectedLead.priority || 'N/A'}
                            </span>
                            <select
                                className="status-select-popup"
                                value={selectedLead.status || 'new'}
                                onChange={(e) => handleStatusChange(selectedLead.id, e.target.value)}
                                style={{ borderColor: STATUS_COLORS[selectedLead.status] || '#94a3b8' }}
                            >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="quoted">Quoted</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                            </select>
                        </div>

                        <div className="popup-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={() => {
                                    onEditLead(selectedLead);
                                    handleClosePopup();
                                }}
                            >
                                ✏️ Edit
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => {
                                    onDeleteLead(selectedLead.id);
                                    handleClosePopup();
                                }}
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LeadMapView;
