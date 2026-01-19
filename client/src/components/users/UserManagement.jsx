import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import UserForm from './UserForm';
import RoleManager from './RoleManager';
import './UserManagement.css';

const UserManagement = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showUserForm, setShowUserForm] = useState(false);
    const [showRoleManager, setShowRoleManager] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Check if current user is admin
    if (currentUser?.role !== 'admin') {
        return (
            <div className="user-management-container">
                <div className="access-denied">
                    <h2>Access Denied</h2>
                    <p>You must be an administrator to access user management.</p>
                </div>
            </div>
        );
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.getUsers();
            setUsers(response.users || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = () => {
        setEditingUser(null);
        setShowUserForm(true);
    };

    const handleEditUser = (user) => {
        setEditingUser(user);
        setShowUserForm(true);
    };

    const handleDeleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        try {
            await api.deleteUser(userId);
            await fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            alert('Failed to delete user. ' + (err.error || 'Please try again.'));
        }
    };

    const handleSaveUser = async (userData) => {
        try {
            if (editingUser) {
                await api.updateUser(editingUser.id, userData);
            } else {
                await api.createUser(userData);
            }
            await fetchUsers();
            setShowUserForm(false);
            setEditingUser(null);
        } catch (err) {
            console.error('Error saving user:', err);
            throw err;
        }
    };

    const handleCancelForm = () => {
        setShowUserForm(false);
        setEditingUser(null);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getRoleBadgeClass = (role) => {
        const roleMap = {
            'admin': 'role-admin',
            'staff': 'role-staff',
            'customer': 'role-customer',
            'contractor': 'role-contractor',
            'consultant': 'role-consultant',
            'other': 'role-other'
        };
        return roleMap[role] || 'role-other';
    };

    if (loading) {
        return (
            <div className="user-management-container">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="user-management-container">
            <div className="user-management-header">
                <div className="header-content">
                    <h1>User Management</h1>
                    <p>Manage user accounts and roles</p>
                </div>
                <div className="header-actions">
                    <button className="btn btn-secondary" onClick={() => setShowRoleManager(true)}>
                        Manage Roles
                    </button>
                    <button className="btn btn-primary" onClick={handleAddUser}>
                        + Add User
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error">
                    {error}
                </div>
            )}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="empty-state">
                                    No users found
                                </td>
                            </tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id}>
                                    <td>
                                        <strong>{user.name || 'No Name'}</strong>
                                        {user.id === currentUser.id && (
                                            <span className="current-user-badge">You</span>
                                        )}
                                    </td>
                                    <td>{user.email}</td>
                                    <td>
                                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                                            {user.role || 'staff'}
                                        </span>
                                    </td>
                                    <td>{formatDate(user.created_at)}</td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon-small"
                                            onClick={() => handleEditUser(user)}
                                            title="Edit user"
                                        >
                                            ✏️
                                        </button>
                                        {user.id !== currentUser.id && (
                                            <button
                                                className="btn-icon-small"
                                                onClick={() => handleDeleteUser(user.id)}
                                                title="Delete user"
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {showUserForm && (
                <UserForm
                    user={editingUser}
                    onSave={handleSaveUser}
                    onCancel={handleCancelForm}
                />
            )}

            {showRoleManager && (
                <RoleManager
                    onClose={() => setShowRoleManager(false)}
                    onRoleCreated={fetchUsers}
                />
            )}
        </div>
    );
};

export default UserManagement;
