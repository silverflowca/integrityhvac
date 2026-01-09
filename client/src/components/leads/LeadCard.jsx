import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './LeadCard.css';

const STATUS_COLORS = {
    new: '#0ea5e9',
    contacted: '#06b6d4',
    qualified: '#8b5cf6',
    quoted: '#f59e0b',
    won: '#10b981',
    lost: '#ef4444',
    do_not_call: '#94a3b8',
    call_back: '#a855f7'
};

const PRIORITY_COLORS = {
    hot: '#ef4444',
    warm: '#f59e0b',
    cold: '#06b6d4'
};

const LeadCard = ({ lead, onEdit, onDelete, onUpdateStatus, onCall }) => {
    const [statuses, setStatuses] = useState([]);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const fetchStatuses = async () => {
        try {
            const response = await api.getStatuses();
            setStatuses(response.statuses || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const handleStatusChange = (e) => {
        onUpdateStatus(lead.id, e.target.value);
    };

    const handleCall = () => {
        if (lead.phone) {
            onCall(lead.phone, lead.id);
        }
    };

    return (
        <div className="lead-card">
            <div className="lead-header">
                <div className="lead-title-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                            className="status-dot"
                            style={{ backgroundColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
                            title={lead.status || 'new'}
                        ></span>
                        <h3 className="lead-company">{lead.name || 'No Name'}</h3>
                    </div>
                    {lead.company && (
                        <div className="lead-contact-name" style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px' }}>
                            {lead.company}
                        </div>
                    )}
                    {lead.location && (
                        <div className="lead-location-subtitle" style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>
                            📍 {lead.location}
                        </div>
                    )}
                </div>
                <div className="lead-actions">
                    <button className="btn-icon" onClick={() => onEdit(lead)} title="Edit">
                        ✏️
                    </button>
                    <button className="btn-icon" onClick={() => onDelete(lead.id)} title="Delete">
                        🗑️
                    </button>
                </div>
            </div>

            <div className="lead-details">
                <div className="lead-detail-item lead-phone-item">
                    <span className="detail-icon">📞</span>
                    <span className="detail-text">{lead.phone || 'No phone'}</span>
                    {lead.phone && (
                        <button
                            className="btn-call"
                            onClick={handleCall}
                            title="Call this number"
                        >
                            📞 Call
                        </button>
                    )}
                </div>
                {lead.email && (
                    <div className="lead-detail-item">
                        <span className="detail-icon">✉️</span>
                        <span className="detail-text">{lead.email}</span>
                    </div>
                )}
                <div className="lead-detail-item">
                    <span className="detail-icon">📅</span>
                    <span className="detail-text">Created: {formatDate(lead.createdAt)}</span>
                </div>
                {lead.callbackDate && (
                    <div className="lead-detail-item lead-callback">
                        <span className="detail-icon">⏰</span>
                        <span className="detail-text"><strong>Callback:</strong> {formatDateTime(lead.callbackDate)}</span>
                    </div>
                )}
            </div>

            {lead.notes && (
                <div className="lead-notes">
                    <strong>Notes:</strong> {lead.notes}
                </div>
            )}

            <div className="lead-footer">
                <div className="lead-tags">
                    <span
                        className="tag tag-priority"
                        style={{ backgroundColor: PRIORITY_COLORS[lead.priority] || '#94a3b8' }}
                    >
                        {lead.priority || 'N/A'}
                    </span>
                    <select
                        className="status-select"
                        value={lead.status || 'new'}
                        onChange={handleStatusChange}
                        style={{ borderColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
                    >
                        {statuses.length > 0 ? (
                            statuses.map(status => (
                                <option key={status.id} value={status.name.toLowerCase().replace(/\s+/g, '_')}>
                                    {status.name}
                                </option>
                            ))
                        ) : (
                            <>
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="qualified">Qualified</option>
                                <option value="quoted">Quoted</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                            </>
                        )}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default LeadCard;
