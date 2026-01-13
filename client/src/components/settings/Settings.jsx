import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './Settings.css';

const Settings = () => {
    const [statuses, setStatuses] = useState([]);
    const [newStatus, setNewStatus] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    useEffect(() => {
        fetchStatuses();
    }, []);

    const fetchStatuses = async () => {
        try {
            setLoading(true);
            const response = await api.getStatuses();
            setStatuses(response.statuses || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching statuses:', err);
            setError('Failed to load statuses');
        } finally {
            setLoading(false);
        }
    };

    const handleAddStatus = async (e) => {
        e.preventDefault();
        if (!newStatus.trim()) return;

        // Check for duplicates
        if (statuses.some(s => s.name.toLowerCase() === newStatus.trim().toLowerCase())) {
            setError('Status already exists');
            return;
        }

        try {
            setSaving(true);
            await api.addStatus(newStatus.trim());
            await fetchStatuses();
            setNewStatus('');
            setSuccess('Status added successfully');
            setError(null);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error adding status:', err);
            setError('Failed to add status');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteStatus = async (statusId) => {
        if (!confirm('Are you sure you want to delete this status?')) return;

        try {
            setSaving(true);
            await api.deleteStatus(statusId);
            await fetchStatuses();
            setSuccess('Status deleted successfully');
            setError(null);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error deleting status:', err);
            setError('Failed to delete status');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = async () => {
        if (!confirm('This will reset all statuses to defaults. Are you sure?')) return;

        try {
            setSaving(true);
            await api.resetStatuses();
            await fetchStatuses();
            setSuccess('Statuses reset to defaults');
            setError(null);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error resetting statuses:', err);
            setError('Failed to reset statuses');
        } finally {
            setSaving(false);
        }
    };

    const handleDragStart = (index) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = async (e, dropIndex) => {
        e.preventDefault();

        if (draggedIndex === null || draggedIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const newStatuses = [...statuses];
        const draggedItem = newStatuses[draggedIndex];

        // Remove from old position
        newStatuses.splice(draggedIndex, 1);

        // Insert at new position
        newStatuses.splice(dropIndex, 0, draggedItem);

        setStatuses(newStatuses);
        setDraggedIndex(null);
        setDragOverIndex(null);

        // Save the new order to the backend
        try {
            setSaving(true);
            await api.reorderStatuses(newStatuses);
            setSuccess('Status order updated');
            setError(null);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Error reordering statuses:', err);
            setError('Failed to update status order');
            // Revert on error
            await fetchStatuses();
        } finally {
            setSaving(false);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    if (loading) {
        return (
            <div className="settings-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-container">
            <div className="settings-header">
                <h1>Settings</h1>
                <p>Manage your CRM configuration</p>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                </div>
            )}

            <div className="settings-section">
                <div className="section-header">
                    <h2>Lead Statuses</h2>
                    <p>Customize the status options available for leads</p>
                </div>

                <div className="status-management">
                    <form onSubmit={handleAddStatus} className="add-status-form">
                        <input
                            type="text"
                            placeholder="Enter new status name"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            className="status-input"
                            disabled={saving}
                        />
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !newStatus.trim()}
                        >
                            Add Status
                        </button>
                    </form>

                    <div className="status-list">
                        <p className="drag-hint">💡 Drag and drop to reorder statuses</p>
                        {statuses.map((status, index) => (
                            <div
                                key={status.id}
                                className={`status-item ${draggedIndex === index ? 'dragging' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                                draggable
                                onDragStart={() => handleDragStart(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="status-item-content">
                                    <span className="drag-handle" title="Drag to reorder">☰</span>
                                    <span className="status-name">{status.name}</span>
                                </div>
                                <div className="status-item-actions">
                                    {!status.isDefault && (
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDeleteStatus(status.id)}
                                            disabled={saving}
                                            title="Delete status"
                                        >
                                            ×
                                        </button>
                                    )}
                                    {status.isDefault && (
                                        <span className="default-badge">Default</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <button
                        className="btn btn-secondary"
                        onClick={handleResetToDefaults}
                        disabled={saving}
                    >
                        Reset to Default Statuses
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
