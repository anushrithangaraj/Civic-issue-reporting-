import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const UserDashboard = () => {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        resolved: 0,
        inProgress: 0,
        reported: 0
    });
    const { user } = useAuth();

    useEffect(() => {
        fetchUserIssues();
    }, []);

    const fetchUserIssues = async () => {
        try {
            const response = await axios.get('http://localhost:5000/api/issues/user/my-issues');
            setIssues(response.data.issues);
            calculateStats(response.data.issues);
        } catch (error) {
            console.error('Error fetching user issues:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (issuesList) => {
        const total = issuesList.length;
        const resolved = issuesList.filter(issue => issue.status === 'resolved').length;
        const inProgress = issuesList.filter(issue => 
            ['approved', 'in_progress', 'under_review'].includes(issue.status)
        ).length;
        const reported = issuesList.filter(issue => issue.status === 'reported').length;

        setStats({ total, resolved, inProgress, reported });
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            reported: { class: 'status-reported', text: 'Reported' },
            under_review: { class: 'status-under-review', text: 'Under Review' },
            approved: { class: 'status-approved', text: 'Approved' },
            in_progress: { class: 'status-in-progress', text: 'In Progress' },
            resolved: { class: 'status-resolved', text: 'Resolved' },
            rejected: { class: 'status-rejected', text: 'Rejected' }
        };
        
        const config = statusConfig[status] || statusConfig.reported;
        return <span className={`status-badge ${config.class}`}>{config.text}</span>;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="user-dashboard">
                <div className="container">
                    <div className="loading">Loading your issues...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="user-dashboard">
            <div className="container">
                <h1>My Reported Issues</h1>
                <p className="welcome-message">Welcome back, {user?.name}! Here's your issue history.</p>
                
                {/* Statistics Cards */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-number">{stats.total}</div>
                        <div className="stat-label">Total Issues</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.resolved}</div>
                        <div className="stat-label">Resolved</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.inProgress}</div>
                        <div className="stat-label">In Progress</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-number">{stats.reported}</div>
                        <div className="stat-label">Pending</div>
                    </div>
                </div>

                {/* Issues List */}
                <div className="issues-list">
                    <h2>Recent Issues</h2>
                    {issues.length === 0 ? (
                        <div className="no-issues">
                            <i className="fas fa-inbox"></i>
                            <h3>No issues reported yet</h3>
                            <p>Start by reporting your first civic issue!</p>
                            <a href="/report" className="btn btn-primary">Report Your First Issue</a>
                        </div>
                    ) : (
                        <div className="issues-table">
                            {issues.map(issue => (
                                <div key={issue._id} className="issue-card">
                                    <div className="issue-header">
                                        <h3>{issue.title}</h3>
                                        {getStatusBadge(issue.status)}
                                    </div>
                                    <div className="issue-meta">
                                        <span className="category">{issue.category.replace('_', ' ')}</span>
                                        <span className="date">Reported on: {formatDate(issue.createdAt)}</span>
                                    </div>
                                    <p className="issue-description">{issue.description}</p>
                                    <div className="issue-footer">
                                        <span className="location">{issue.location?.address || 'Location not specified'}</span>
                                        {issue.assignedTo && (
                                            <span className="assigned-to">
                                                Assigned to: {issue.assignedTo.name}
                                            </span>
                                        )}
                                    </div>
                                    {issue.comments && issue.comments.length > 0 && (
                                        <div className="issue-comments">
                                            <strong>Latest Update:</strong> 
                                            {issue.comments[issue.comments.length - 1].text}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserDashboard;