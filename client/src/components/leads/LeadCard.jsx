import React from 'react';
import './LeadCard.css';

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

const LeadCard = ({ lead, onEdit, onDelete, onUpdateStatus, onCall }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleStatusChange = (e) => {
        onUpdateStatus(lead.id, e.target.value);
    };

    const handleCall = () => {
        if (lead.phone) {
            onCall(lead.phone);
        }
    };

    return (
        <div className="lead-card">
            <div className="lead-header">
                <div className="lead-title-section">
                    <h3 className="lead-company">{lead.company || 'No Company'}</h3>
                    <div className="lead-contact-name">{lead.name || 'No Name'}</div>
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
                <div className="lead-detail-item">
                    <span className="detail-icon">✉️</span>
                    <span className="detail-text">{lead.email || 'No email'}</span>
                </div>
                <div className="lead-detail-item">
                    <span className="detail-icon">📍</span>
                    <span className="detail-text">{lead.location || 'No location'}</span>
                </div>
                <div className="lead-detail-item">
                    <span className="detail-icon">📅</span>
                    <span className="detail-text">Created: {formatDate(lead.createdAt)}</span>
                </div>
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
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="quoted">Quoted</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default LeadCard;
