import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './BulkActionModal.css';

const BulkActionModal = ({
    isOpen,
    onClose,
    action,
    selectedLeadIds,
    filters,
    isServerSideMode,
    matchingCount,
    onSuccess,
    campaigns,
    statuses,
    users
}) => {
    const [targetValue, setTargetValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [confirmText, setConfirmText] = useState('');

    useEffect(() => {
        setTargetValue('');
        setError(null);
        setConfirmText('');
    }, [action, isOpen]);

    if (!isOpen) return null;

    const getActionTitle = () => {
        switch (action) {
            case 'move_campaign': return 'Move to Campaign';
            case 'change_status': return 'Change Status';
            case 'change_priority': return 'Change Priority';
            case 'assign_user': return 'Assign to User';
            case 'delete': return 'Delete Leads';
            default: return 'Bulk Action';
        }
    };

    const getActionDescription = () => {
        const count = isServerSideMode ? matchingCount : selectedLeadIds.length;
        switch (action) {
            case 'move_campaign': return `Move ${count.toLocaleString()} leads to a campaign`;
            case 'change_status': return `Change status of ${count.toLocaleString()} leads`;
            case 'change_priority': return `Change priority of ${count.toLocaleString()} leads`;
            case 'assign_user': return `Assign ${count.toLocaleString()} leads to a user`;
            case 'delete': return `Permanently delete ${count.toLocaleString()} leads`;
            default: return '';
        }
    };

    const renderTargetSelector = () => {
        switch (action) {
            case 'move_campaign':
                return (
                    <div className="form-group">
                        <label>Target Campaign</label>
                        <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bulk-select"
                        >
                            <option value="">No Campaign (Remove from campaign)</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                );

            case 'change_status':
                return (
                    <div className="form-group">
                        <label>New Status</label>
                        <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bulk-select"
                            required
                        >
                            <option value="">Select Status...</option>
                            {statuses.map(s => (
                                <option key={s.id} value={s.name.toLowerCase().replace(/\s+/g, '_')}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                );

            case 'change_priority':
                return (
                    <div className="form-group">
                        <label>New Priority</label>
                        <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bulk-select"
                        >
                            <option value="">No Priority</option>
                            <option value="hot">Hot</option>
                            <option value="warm">Warm</option>
                            <option value="cold">Cold</option>
                        </select>
                    </div>
                );

            case 'assign_user':
                return (
                    <div className="form-group">
                        <label>Assign To</label>
                        <select
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            className="bulk-select"
                        >
                            <option value="">Unassigned</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name || u.email}</option>
                            ))}
                        </select>
                    </div>
                );

            case 'delete':
                const count = isServerSideMode ? matchingCount : selectedLeadIds.length;
                return (
                    <div className="form-group delete-warning">
                        <div className="warning-icon">⚠️</div>
                        <p className="warning-text">
                            This action cannot be undone. You are about to permanently delete{' '}
                            <strong>{count.toLocaleString()}</strong> leads.
                        </p>
                        <label>Type "DELETE" to confirm:</label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="DELETE"
                            className="confirm-input"
                        />
                    </div>
                );

            default:
                return null;
        }
    };

    const canSubmit = () => {
        if (action === 'delete') {
            return confirmText === 'DELETE';
        }
        if (action === 'change_status') {
            return targetValue !== '';
        }
        return true;
    };

    const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const payload = {
                action,
                targetValue: targetValue || null
            };

            if (isServerSideMode) {
                payload.filters = filters;
            } else {
                payload.leadIds = selectedLeadIds;
            }

            const result = await api.bulkAction(payload);

            if (result.success) {
                onSuccess(result);
                onClose();
            } else {
                setError(result.error || 'Failed to perform bulk action');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const count = isServerSideMode ? matchingCount : selectedLeadIds.length;

    return (
        <div className="bulk-modal-overlay" onClick={onClose}>
            <div className="bulk-modal" onClick={(e) => e.stopPropagation()}>
                <div className="bulk-modal-header">
                    <h2>{getActionTitle()}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="bulk-modal-body">
                    <p className="bulk-description">{getActionDescription()}</p>

                    {isServerSideMode && (
                        <div className="filter-summary">
                            <strong>Applied Filters:</strong>
                            <ul>
                                {filters.campaign_id && <li>Campaign: {campaigns.find(c => c.id === filters.campaign_id)?.name || 'Selected'}</li>}
                                {filters.campaign_id === '' && <li>Campaign: No Campaign</li>}
                                {filters.status && <li>Status: {filters.status}</li>}
                                {filters.priority && <li>Priority: {filters.priority}</li>}
                                {filters.assigned_to && <li>Assigned to: {users.find(u => u.id === filters.assigned_to)?.name || 'Selected'}</li>}
                            </ul>
                        </div>
                    )}

                    {renderTargetSelector()}

                    {error && (
                        <div className="bulk-error">
                            {error}
                        </div>
                    )}
                </div>

                <div className="bulk-modal-footer">
                    <button
                        className="btn-cancel"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className={`btn-confirm ${action === 'delete' ? 'btn-danger' : ''}`}
                        onClick={handleSubmit}
                        disabled={!canSubmit() || isLoading}
                    >
                        {isLoading ? 'Processing...' : `Apply to ${count.toLocaleString()} leads`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BulkActionModal;
