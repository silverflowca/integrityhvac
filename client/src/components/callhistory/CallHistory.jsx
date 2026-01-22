import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './CallHistory.css';

const CallHistory = ({ onEditLead, onCall }) => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [total, setTotal] = useState(0);
    const itemsPerPage = 50;

    useEffect(() => {
        fetchCallHistory();
    }, [currentPage]);

    const fetchCallHistory = async () => {
        try {
            setLoading(true);
            const response = await api.getCallHistory(currentPage, itemsPerPage);
            setCalls(response.calls || []);
            setTotal(response.total || 0);
            setTotalPages(response.totalPages || 0);
            setError(null);
        } catch (err) {
            console.error('Error fetching call history:', err);
            setError('Failed to load call history');
        } finally {
            setLoading(false);
        }
    };

    const formatDateTime = (timestamp) => {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds || seconds === 0) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    const getStatusBadgeClass = (status) => {
        const statusClasses = {
            new: 'badge-new',
            contacted: 'badge-contacted',
            qualified: 'badge-qualified',
            quoted: 'badge-quoted',
            won: 'badge-won',
            lost: 'badge-lost'
        };
        return statusClasses[status] || 'badge-default';
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (loading && calls.length === 0) {
        return (
            <div className="call-history-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading call history...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="call-history-container">
                <div className="error-state">
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchCallHistory}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (calls.length === 0) {
        return (
            <div className="call-history-container">
                <div className="call-history-header">
                    <div className="header-content">
                        <h2>Call History</h2>
                        <p>Your recent calls</p>
                    </div>
                </div>
                <div className="empty-state">
                    <div className="empty-icon">📞</div>
                    <h3>No calls yet</h3>
                    <p>Your call history will appear here once you start making calls.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="call-history-container">
            <div className="call-history-header">
                <div className="header-content">
                    <h2>Call History</h2>
                    <p>Your recent calls</p>
                </div>
                <div className="summary-stats">
                    <div className="stat-card">
                        <div className="stat-value">{total}</div>
                        <div className="stat-label">Total Calls</div>
                    </div>
                </div>
            </div>

            <div className="call-history-list">
                <table className="call-history-table">
                    <thead>
                        <tr>
                            <th>Company / Name</th>
                            <th>Phone</th>
                            <th>Call Time</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Campaign</th>
                            <th>Notes</th>
                            <th>Edit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {calls.map(call => (
                            <tr key={`${call.id}-${call.lastCallTime}`}>
                                <td className="company-cell">
                                    <div className="company-name">{call.company || call.name || '-'}</div>
                                    {call.company && call.name && call.company !== call.name && (
                                        <div className="contact-name">{call.name}</div>
                                    )}
                                </td>
                                <td className="phone-cell">
                                    <div className="phone-with-dial">
                                        <span>{call.phone || '-'}</span>
                                        {call.phone && (
                                            <button
                                                className="btn-dial-inline"
                                                onClick={() => onCall && onCall(call.phone, call.id)}
                                                title="Call again"
                                            >
                                                📞
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="datetime-cell">
                                    <div className="call-datetime">{formatDateTime(call.lastCallTime)}</div>
                                </td>
                                <td className="duration-cell">{formatDuration(call.callDuration)}</td>
                                <td>
                                    <span className={`status-badge ${getStatusBadgeClass(call.status)}`}>
                                        {call.status || 'new'}
                                    </span>
                                </td>
                                <td className="campaign-cell">
                                    {call.campaignName ? (
                                        <span className="campaign-tag">{call.campaignName}</span>
                                    ) : '-'}
                                </td>
                                <td className="notes-cell">
                                    {call.callNotes ? (
                                        <span className="call-notes" title={call.callNotes}>
                                            {call.callNotes.length > 30
                                                ? call.callNotes.substring(0, 30) + '...'
                                                : call.callNotes}
                                        </span>
                                    ) : '-'}
                                </td>
                                <td className="actions-cell">
                                    <button
                                        className="btn-action btn-edit"
                                        onClick={() => onEditLead && onEditLead(call)}
                                        title="Edit lead"
                                    >
                                        ✏️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination">
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        Previous
                    </button>
                    <span className="pagination-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        className="pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

export default CallHistory;
