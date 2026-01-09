import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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

function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await api.getAdminDashboard();
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
                <p>Loading team dashboard...</p>
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
    const statusData = Object.entries(stats.statusBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[name]
    }));

    const priorityData = Object.entries(stats.priorityBreakdown).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: COLORS[name]
    }));

    // Team performance data
    const teamData = stats.userStats.map(user => ({
        name: user.name,
        calls: user.totalCalls,
        leads: user.totalLeads,
        won: user.wonLeads,
        rate: parseFloat(user.conversionRate)
    }));

    // Call minutes data - sorted by total minutes descending
    const callMinutesData = stats.userStats
        .map(user => ({
            name: user.name,
            minutes: user.totalCallMinutes || 0
        }))
        .sort((a, b) => b.minutes - a.minutes);

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Team Dashboard</h1>
                <p>Overview of team performance and metrics</p>
            </div>

            {/* Key Metrics Row */}
            <div className="metrics-grid">
                <div className="metric-card">
                    <div className="metric-icon">📊</div>
                    <div className="metric-content">
                        <h3>Total Leads</h3>
                        <div className="metric-value">{stats.totalLeads}</div>
                        <div className="metric-subtext">All team leads</div>
                    </div>
                </div>

                <div className="metric-card success">
                    <div className="metric-icon">✅</div>
                    <div className="metric-content">
                        <h3>Won Leads</h3>
                        <div className="metric-value">{stats.wonLeads}</div>
                        <div className="metric-subtext">Successful conversions</div>
                    </div>
                </div>

                <div className="metric-card danger">
                    <div className="metric-icon">❌</div>
                    <div className="metric-content">
                        <h3>Lost Leads</h3>
                        <div className="metric-value">{stats.lostLeads}</div>
                        <div className="metric-subtext">Unsuccessful attempts</div>
                    </div>
                </div>

                <div className="metric-card">
                    <div className="metric-icon">💯</div>
                    <div className="metric-content">
                        <h3>Conversion Rate</h3>
                        <div className="metric-value">{stats.conversionRate}%</div>
                        <div className="metric-subtext">Team average</div>
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

            {/* Call Minutes Time Breakdown Card */}
            <div className="time-breakdown-card">
                <h3>📞 Total Call Minutes</h3>
                <div className="time-breakdown-grid">
                    <div className="time-period-card today">
                        <div className="period-icon">📅</div>
                        <div className="period-content">
                            <div className="period-label">Today</div>
                            <div className="period-value">{stats.callMinutesToday || 0}</div>
                            <div className="period-unit">minutes</div>
                        </div>
                    </div>
                    <div className="time-period-card week">
                        <div className="period-icon">📊</div>
                        <div className="period-content">
                            <div className="period-label">This Week</div>
                            <div className="period-value">{stats.callMinutesWeek || 0}</div>
                            <div className="period-unit">minutes</div>
                        </div>
                    </div>
                    <div className="time-period-card month">
                        <div className="period-icon">📈</div>
                        <div className="period-content">
                            <div className="period-label">This Month</div>
                            <div className="period-value">{stats.callMinutesMonth || 0}</div>
                            <div className="period-unit">minutes</div>
                        </div>
                    </div>
                    <div className="time-period-card year">
                        <div className="period-icon">🎯</div>
                        <div className="period-content">
                            <div className="period-label">This Year</div>
                            <div className="period-value">{stats.callMinutesYear || 0}</div>
                            <div className="period-unit">minutes</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="charts-grid">
                {/* Total Call Minutes by User - Horizontal Bar Chart */}
                <div className="chart-card full-width">
                    <h3>Total Call Minutes by User</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={callMinutesData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={120} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="minutes" fill="#10b981" name="Minutes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Team Performance */}
                <div className="chart-card full-width">
                    <h3>Team Performance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={teamData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
                            <YAxis yAxisId="right" orientation="right" stroke="#22c55e" />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="calls" fill="#3b82f6" name="Calls" />
                            <Bar yAxisId="left" dataKey="leads" fill="#8b5cf6" name="Leads" />
                            <Bar yAxisId="left" dataKey="won" fill="#22c55e" name="Won" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Status Breakdown */}
                <div className="chart-card">
                    <h3>Leads by Status</h3>
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
                </div>

                {/* Priority Breakdown */}
                <div className="chart-card">
                    <h3>Leads by Priority</h3>
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
                </div>
            </div>

            {/* Team Performance Table */}
            <div className="team-table-card">
                <h3>Individual Performance</h3>
                <div className="table-container">
                    <table className="performance-table">
                        <thead>
                            <tr>
                                <th>Team Member</th>
                                <th>Total Calls</th>
                                <th>Call Minutes</th>
                                <th>Total Leads</th>
                                <th>Won Leads</th>
                                <th>Conversion Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.userStats.map(user => (
                                <tr key={user.userId}>
                                    <td><strong>{user.name}</strong></td>
                                    <td>{user.totalCalls}</td>
                                    <td>{user.totalCallMinutes || 0} min</td>
                                    <td>{user.totalLeads}</td>
                                    <td className="won">{user.wonLeads}</td>
                                    <td>
                                        <span className={'rate-badge ' + (user.conversionRate >= 50 ? 'high' : user.conversionRate >= 25 ? 'medium' : 'low')}>
                                            {user.conversionRate}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Activity */}
            {stats.recentActivities && stats.recentActivities.length > 0 && (
                <div className="activity-card">
                    <h3>Recent Team Activity</h3>
                    <div className="activity-list">
                        {stats.recentActivities.slice(0, 10).map(activity => (
                            <div key={activity.id} className="activity-item">
                                <div className="activity-icon">
                                    {activity.type === 'call' ? '📞' : activity.type === 'email' ? '📧' : '📝'}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-text">{activity.notes || `${activity.type} activity`}</div>
                                    <div className="activity-time">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminDashboard;
