import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

const RoleManager = ({ onClose, onRoleCreated }) => {
    const [roles, setRoles] = useState([]);
    const [newRole, setNewRole] = useState({ name: '', description: '' });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const response = await api.getRoles();
            setRoles(response.roles || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching roles:', err);
            setError('Failed to load roles');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!newRole.name.trim()) {
            setError('Role name is required');
            return;
        }

        try {
            setSaving(true);
            await api.createRole(newRole);
            await fetchRoles();
            setNewRole({ name: '', description: '' });
            if (onRoleCreated) {
                onRoleCreated();
            }
        } catch (err) {
            console.error('Error creating role:', err);
            setError(err.error || 'Failed to create role. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Role Management</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {error && (
                        <div className="alert alert-error">
                            {error}
                        </div>
                    )}

                    <div className="role-manager-section">
                        <h3>Existing Roles</h3>
                        {loading ? (
                            <div className="loading-state">
                                <div className="spinner-small"></div>
                                <p>Loading roles...</p>
                            </div>
                        ) : (
                            <div className="roles-list">
                                {roles.length === 0 ? (
                                    <p className="empty-state">No roles found</p>
                                ) : (
                                    roles.map(role => (
                                        <div key={role.id} className="role-item">
                                            <div className="role-info">
                                                <strong>{role.name}</strong>
                                                {role.description && (
                                                    <p>{role.description}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    <div className="role-manager-section">
                        <h3>Add New Role</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="roleName">Role Name *</label>
                                <input
                                    type="text"
                                    id="roleName"
                                    value={newRole.name}
                                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                                    placeholder="e.g., manager, supervisor"
                                    required
                                    disabled={saving}
                                />
                                <small>Use lowercase, no spaces (e.g., "project_manager")</small>
                            </div>

                            <div className="form-group">
                                <label htmlFor="roleDescription">Description</label>
                                <textarea
                                    id="roleDescription"
                                    value={newRole.description}
                                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                                    placeholder="Brief description of this role"
                                    rows="3"
                                    disabled={saving}
                                />
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={saving}
                            >
                                {saving ? 'Creating...' : 'Create Role'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleManager;
