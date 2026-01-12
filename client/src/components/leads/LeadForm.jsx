import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './LeadForm.css';

const LeadForm = ({ lead, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        company: '',
        name: '',
        phone: '',
        email: '',
        location: '',
        status: 'new',
        priority: 'warm',
        notes: '',
        callbackDate: '',
        assignedTo: ''
    });
    const [statuses, setStatuses] = useState([]);
    const [loadingStatuses, setLoadingStatuses] = useState(true);
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        fetchStatuses();
        fetchUsers();
    }, []);

    useEffect(() => {
        if (lead) {
            setFormData({
                company: lead.company || '',
                name: lead.name || '',
                phone: lead.phone || '',
                email: lead.email || '',
                location: lead.location || '',
                status: lead.status || 'new',
                priority: lead.priority || 'warm',
                notes: lead.notes || '',
                callbackDate: lead.callbackDate || '',
                assignedTo: lead.assignedTo || ''
            });
        }
    }, [lead]);

    const fetchStatuses = async () => {
        try {
            setLoadingStatuses(true);
            const response = await api.getStatuses();
            setStatuses(response.statuses || []);
        } catch (error) {
            console.error('Error fetching statuses:', error);
            // Fallback to default statuses
            setStatuses([
                { id: '1', name: 'New', isDefault: true },
                { id: '2', name: 'Contacted', isDefault: true },
                { id: '3', name: 'No answer', isDefault: true },
                { id: '4', name: 'Phone number not in service', isDefault: true },
                { id: '5', name: 'Qualified', isDefault: true },
                { id: '6', name: 'Quoted', isDefault: true },
                { id: '7', name: 'Cleaning Lead', isDefault: true },
                { id: '8', name: 'Won', isDefault: true },
                { id: '9', name: 'Lost', isDefault: true },
                { id: '10', name: 'Do Not Call', isDefault: true },
                { id: '11', name: 'Call Back', isDefault: true }
            ]);
        } finally {
            setLoadingStatuses(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const response = await api.getUsers();
            setUsers(response.users || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            setUsers([]);
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
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

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    const formatFieldValue = (value) => {
        if (!value || value === '') return 'empty';
        return value;
    };

    const formatAuditAction = (entry) => {
        if (entry.action === 'called') {
            const duration = entry.duration ? ` (${formatDuration(entry.duration)})` : '';
            return `📞 Called${duration}`;
        } else if (entry.action === 'updated') {
            return '✏️ Updated';
        }
        return entry.action;
    };

    const getLastCallInfo = () => {
        if (!lead || !lead.auditTrail) return null;
        const lastCall = lead.auditTrail.slice().reverse().find(entry => entry.action === 'called');
        return lastCall;
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    <div className="header-actions">
                        <button type="button" className="btn btn-secondary-header" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary-header" onClick={handleSubmit}>
                            {lead ? 'Update' : 'Create'}
                        </button>
                        <button className="modal-close" onClick={onCancel}>×</button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="lead-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Contact Name *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Enter contact name"
                            />
                        </div>

                        <div className="form-group">
                            <label>Company Name</label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                placeholder="Enter company name (optional)"
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone *</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                required
                                placeholder="(555) 123-4567"
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label>Location</label>
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="City, State"
                            />
                        </div>

                        <div className="form-group">
                            <label>Priority</label>
                            <select
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                            >
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                disabled={loadingStatuses}
                            >
                                {loadingStatuses ? (
                                    <option>Loading...</option>
                                ) : (
                                    statuses.map(status => (
                                        <option key={status.id} value={status.name.toLowerCase().replace(/\s+/g, '_')}>
                                            {status.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Callback Date</label>
                            <input
                                type="datetime-local"
                                name="callbackDate"
                                value={formData.callbackDate}
                                onChange={handleChange}
                                placeholder="Set callback reminder"
                            />
                        </div>

                        <div className="form-group">
                            <label>Assigned To</label>
                            <select
                                name="assignedTo"
                                value={formData.assignedTo}
                                onChange={handleChange}
                                disabled={loadingUsers}
                            >
                                <option value="">Unassigned</option>
                                {loadingUsers ? (
                                    <option>Loading...</option>
                                ) : (
                                    users.map(user => (
                                        <option key={user.id} value={user.id}>
                                            {user.name || user.email}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                    </div>

                    <div className="form-group full-width">
                        <label>Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="8"
                            placeholder="Add any additional notes or comments..."
                        />
                    </div>

                    {lead && getLastCallInfo() && (
                        <div className="last-call-section">
                            <h3>Last Call</h3>
                            <div className="last-call-info">
                                <div className="last-call-main">
                                    <span className="last-call-label">📞 Called by:</span>
                                    <span className="last-call-user">{getLastCallInfo().userName}</span>
                                    <span className="last-call-time">{formatDateTime(getLastCallInfo().timestamp)}</span>
                                </div>
                                {getLastCallInfo().duration > 0 && (
                                    <div className="last-call-duration">
                                        Duration: {formatDuration(getLastCallInfo().duration)}
                                    </div>
                                )}
                                {getLastCallInfo().notes && (
                                    <div className="last-call-notes">
                                        <strong>Notes:</strong> {getLastCallInfo().notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {lead && lead.auditTrail && lead.auditTrail.length > 0 && (
                        <div className="audit-trail-section">
                            <h3>Recent Activity</h3>
                            <div className="audit-entries">
                                {lead.auditTrail.slice().reverse().map((entry, index) => (
                                    <div key={index} className="audit-entry">
                                        <div className="audit-main">
                                            <span className="audit-action">{formatAuditAction(entry)}</span>
                                            <span className="audit-user">{entry.userName}</span>
                                            <span className="audit-time">{formatDateTime(entry.timestamp)}</span>
                                        </div>
                                        {entry.action === 'updated' && entry.changes && entry.changes.length > 0 && (
                                            <div className="audit-changes">
                                                {entry.changes.map((change, i) => (
                                                    <div key={i} className="audit-change-item">
                                                        <span className="change-field">{change.field}:</span>
                                                        <span className="change-values">
                                                            {formatFieldValue(change.oldValue)} → {formatFieldValue(change.newValue)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {entry.action === 'called' && entry.notes && (
                                            <div className="audit-notes">{entry.notes}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onCancel}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            {lead ? 'Update Lead' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeadForm;
