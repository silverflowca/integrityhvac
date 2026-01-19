import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './UserManagement.css';

const UserForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        email: '',
        name: '',
        role: 'staff',
        password: ''
    });
    const [roles, setRoles] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRoles();
        if (user) {
            setFormData({
                email: user.email || '',
                name: user.name || '',
                role: user.role || 'staff',
                password: '' // Don't populate password for editing
            });
        }
    }, [user]);

    const fetchRoles = async () => {
        try {
            const response = await api.getRoles();
            setRoles(response.roles || [
                { name: 'admin', description: 'Administrator' },
                { name: 'staff', description: 'Staff Member' },
                { name: 'customer', description: 'Customer' },
                { name: 'contractor', description: 'Contractor' },
                { name: 'consultant', description: 'Consultant' },
                { name: 'other', description: 'Other' }
            ]);
        } catch (err) {
            console.error('Error fetching roles:', err);
            // Use default roles on error
            setRoles([
                { name: 'admin', description: 'Administrator' },
                { name: 'staff', description: 'Staff Member' },
                { name: 'customer', description: 'Customer' },
                { name: 'contractor', description: 'Contractor' },
                { name: 'consultant', description: 'Consultant' },
                { name: 'other', description: 'Other' }
            ]);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate
        if (!formData.email || !formData.email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        if (!user && !formData.password) {
            setError('Password is required for new users');
            return;
        }

        if (formData.password && formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        try {
            setSaving(true);
            const dataToSave = { ...formData };
            // Don't send password if it's empty (for updates)
            if (!dataToSave.password) {
                delete dataToSave.password;
            }
            await onSave(dataToSave);
        } catch (err) {
            console.error('Error saving user:', err);
            setError(err.error || 'Failed to save user. Please try again.');
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{user ? 'Edit User' : 'Add New User'}</h2>
                    <button className="btn-close" onClick={onCancel}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {error && (
                            <div className="alert alert-error">
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email *</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                disabled={saving}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="role">Role *</label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                disabled={saving}
                            >
                                {roles.map(role => (
                                    <option key={role.name} value={role.name}>
                                        {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">
                                Password {user ? '(leave blank to keep current)' : '*'}
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required={!user}
                                disabled={saving}
                                minLength="6"
                            />
                            <small>Minimum 6 characters</small>
                        </div>
                    </div>

                    <div className="modal-footer">
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
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : (user ? 'Update User' : 'Create User')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserForm;
