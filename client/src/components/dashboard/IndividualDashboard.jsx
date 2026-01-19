import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';
import './Dashboard.css';

const COLORS = {
    new: '#3b82f6',
    contacted: '#8b5cf6',
    qualified: '#10b981',
    quoted: '#f59e0b',
    won: '#22c55e',
    lost: '#ef4444',
    hot: '#ef4444',
    warm: '#f59e0b',
    cold: '#3b82f6'
};

function IndividualDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await api.getIndividualDashboard();
            setStats(response.stats);
            setError(null);
        } catch (err) {
            console.error('Error fetching dashboard stats:', err);
            setError('Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="spinner"></div>
                <p>Loading your dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-error">
                <p>{error}</p>
                <button className="btn btn-primary" onClick={fetchDashboardStats}>Retry</button>
            </div>
        );
    }

    // Prepare chart data
    const statusData = Object.entries(stats.statusBreakdown || {})
        .filter(([name, value]) => value > 0)
        .map(([name, value]) => ({
            name: name.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            value,
            color: COLORS[name] || '#94a3b8'
        }));

    const priorityData = Object.entries(stats.priorityBreakdown || {})
        .filter(([name, value]) => value > 0)
        .map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: COLORS[name] || '#94a3b8'
        }));

    const activityData = Object.entries(stats.activityByDay).map(([date, activities]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Calls: activities.calls,
        Emails: activities.emails,
        Notes: activities.notes
    }));

    const callProgress = stats.callProgress;

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>My Dashboard</h1>
                <p>Track your performance and progress</p>
            </div>

            {/* Key Metrics Row */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon">📞</div>
                    <div className="metric-content">
                        <h3>Today's Calls</h3>
                        <div className="metric-value">{stats.todayCalls}</div>
                        <div className="metric-subtext">Goal: {stats.dailyCallGoal}</div>
                        <div className="progress-bar">
                            <div
                                className="progress-fill"
                                style={{ width: `${callProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                        <h3>Total Leads</h3>
                        <div className="metric-value">{stats.totalLeads}</div>
                        <div className="metric-subtext">
                            <span className="won">{stats.wonLeads} won</span> / <span className="lost">{stats.lostLeads} lost</span>
                        </div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">💯</div>
                    <div className="metric-content">
                        <h3>Conversion Rate</h3>
                        <div className="metric-value">{stats.conversionRate}%</div>
                        <div className="metric-subtext">Win rate</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">⏱️</div>
                    <div className="metric-content">
                        <h3>Avg Call Duration</h3>
                        <div className="metric-value">{stats.avgCallDuration}s</div>
                        <div className="metric-subtext">{stats.totalCalls} total calls</div>
                    </div>
                </div>
            </div>

            {/* Activity Stats Row */}
            <div className="stats-row">
                <div className="stat-card">
                    <h4>Total Calls</h4>
                    <div className="stat-value">{stats.totalCalls}</div>
                </div>
                <div className="stat-card">
                    <h4>Total Emails</h4>
                    <div className="stat-value">{stats.totalEmails}</div>
                </div>
                <div className="stat-card">
                    <h4>Total Notes</h4>
                    <div className="stat-value">{stats.totalNotes}</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                {/* Activity Timeline */}
                <div className="chart-card full-width">
                    <h3>Activity Timeline (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={activityData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="Calls" stroke="#3b82f6" strokeWidth={2} />
                            <Line type="monotone" dataKey="Emails" stroke="#8b5cf6" strokeWidth={2} />
                            <Line type="monotone" dataKey="Notes" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Breakdown */}
                <div className="chart-card">
                    <h3>Leads by Status</h3>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">
                            <p>No leads assigned yet</p>
                        </div>
                    )}
                </div>

                {/* Priority Breakdown */}
                <div className="chart-card">
                    <h3>Leads by Priority</h3>
                    {priorityData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={priorityData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, value }) => `${name}: ${value}`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {priorityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty-chart">
                            <p>No leads assigned yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default IndividualDashboard;
