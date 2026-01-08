import React from 'react';
import './LeadListView.css';

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

const LeadListView = ({ leads, onEditLead, onDeleteLead, onUpdateStatus, onCall }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handleStatusChange = (leadId, newStatus) => {
        onUpdateStatus(leadId, newStatus);
    };

    const handleCall = (phoneNumber) => {
        if (phoneNumber) {
            onCall(phoneNumber);
        }
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
        <div className="list-view-container">
            <table className="leads-table">
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Contact</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Location</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {leads.map((lead) => (
                        <tr key={lead.id} className="lead-row">
                            <td className="lead-company-cell">
                                <strong>{lead.company || 'No Company'}</strong>
                            </td>
                            <td>{lead.name || 'No Name'}</td>
                            <td className="phone-cell">
                                {lead.phone ? (
                                    <>
                                        <span>{lead.phone}</span>
                                        <button
                                            className="btn-call-small"
                                            onClick={() => handleCall(lead.phone)}
                                            title="Call"
                                        >
                                            📞
                                        </button>
                                    </>
                                ) : (
                                    'No phone'
                                )}
                            </td>
                            <td className="email-cell">{lead.email || 'No email'}</td>
                            <td>{lead.location || 'No location'}</td>
                            <td>
                                <span
                                    className="priority-badge"
                                    style={{ backgroundColor: PRIORITY_COLORS[lead.priority] || '#94a3b8' }}
                                >
                                    {lead.priority || 'N/A'}
                                </span>
                            </td>
                            <td>
                                <select
                                    className="status-select-inline"
                                    value={lead.status || 'new'}
                                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                    style={{ borderColor: STATUS_COLORS[lead.status] || '#94a3b8' }}
                                >
                                    <option value="new">New</option>
                                    <option value="contacted">Contacted</option>
                                    <option value="qualified">Qualified</option>
                                    <option value="quoted">Quoted</option>
                                    <option value="won">Won</option>
                                    <option value="lost">Lost</option>
                                </select>
                            </td>
                            <td>{formatDate(lead.createdAt)}</td>
                            <td className="actions-cell">
                                <button
                                    className="btn-icon-small"
                                    onClick={() => onEditLead(lead)}
                                    title="Edit"
                                >
                                    ✏️
                                </button>
                                <button
                                    className="btn-icon-small"
                                    onClick={() => onDeleteLead(lead.id)}
                                    title="Delete"
                                >
                                    🗑️
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LeadListView;
