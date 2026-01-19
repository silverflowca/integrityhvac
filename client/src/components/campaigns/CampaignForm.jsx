import React, { useState, useEffect } from 'react';
import './CampaignForm.css';

const CampaignForm = ({ campaign, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        status: 'active'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (campaign) {
            setFormData({
                name: campaign.name || '',
                description: campaign.description || '',
                status: campaign.status || 'active'
            });
        }
    }, [campaign]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('Campaign name is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);
            await onSave(formData);
        } catch (err) {
            setError(err.message || 'Failed to save campaign');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content campaign-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
                    <button className="modal-close" onClick={onCancel}>&times;</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="name">Campaign Name *</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter campaign name"
                            disabled={saving}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Description</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter campaign description (optional)"
                            rows="3"
                            disabled={saving}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="status">Status</label>
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            disabled={saving}
                        >
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onCancel}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !formData.name.trim()}
                        >
                            {saving ? 'Saving...' : (campaign ? 'Update Campaign' : 'Create Campaign')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CampaignForm;
