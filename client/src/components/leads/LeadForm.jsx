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
        callbackDate: ''
    });
    const [statuses, setStatuses] = useState([]);
    const [loadingStatuses, setLoadingStatuses] = useState(true);

    useEffect(() => {
        fetchStatuses();
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
                callbackDate: lead.callbackDate || ''
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
                { id: '3', name: 'Qualified', isDefault: true },
                { id: '4', name: 'Quoted', isDefault: true },
                { id: '5', name: 'Won', isDefault: true },
                { id: '6', name: 'Lost', isDefault: true }
            ]);
        } finally {
            setLoadingStatuses(false);
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

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{lead ? 'Edit Lead' : 'Add New Lead'}</h2>
                    <button className="modal-close" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="lead-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Company Name *</label>
                            <input
                                type="text"
                                name="company"
                                value={formData.company}
                                onChange={handleChange}
                                required
                                placeholder="Enter company name"
                            />
                        </div>

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
                    </div>

                    <div className="form-group full-width">
                        <label>Notes</label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows="4"
                            placeholder="Add any additional notes or comments..."
                        />
                    </div>

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
