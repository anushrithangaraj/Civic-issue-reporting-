import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    reported: 0,
    under_review: 0,
    approved: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    category: '',
    priority: ''
  });
  const [userDepartment, setUserDepartment] = useState('');

  const statusOptions = [
    { value: 'reported', label: 'Reported', color: '#ffc107', icon: '📝' },
    { value: 'under_review', label: 'Under Review', color: '#17a2b8', icon: '🔍' },
    { value: 'approved', label: 'Approved', color: '#007bff', icon: '✅' },
    { value: 'in_progress', label: 'In Progress', color: '#fd7e14', icon: '🚧' },
    { value: 'resolved', label: 'Resolved', color: '#28a745', icon: '🏁' },
    { value: 'rejected', label: 'Rejected', color: '#dc3545', icon: '❌' }
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#28a745' },
    { value: 'medium', label: 'Medium', color: '#ffc107' },
    { value: 'high', label: 'High', color: '#fd7e14' },
    { value: 'critical', label: 'Critical', color: '#dc3545' }
  ];

  const categoryOptions = [
    { value: 'pothole', label: 'Pothole' },
    { value: 'streetlight', label: 'Broken Streetlight' },
    { value: 'garbage', label: 'Garbage Overflow' },
    { value: 'water_leak', label: 'Water Leak' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'drainage', label: 'Drainage Issue' },
    { value: 'other', label: 'Other' }
  ];

  // Department mapping for display
  const departmentDisplayNames = {
    'public_works': 'Public Works (Potholes, Roads, Drainage)',
    'electrical': 'Electrical (Street Lights)',
    'sanitation': 'Sanitation (Garbage)',
    'water_dept': 'Water Department (Water Leaks)',
    'other': 'Other Departments',
    'admin': 'Administrator (All Issues)'
  };

  useEffect(() => {
    fetchIssues();
  }, [filters]);

  const fetchIssues = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);

      const response = await axios.get(`/admin/issues?${params}`);
      setIssues(response.data.issues);
      
      // Use backend stats if available, otherwise calculate frontend stats
      if (response.data.stats) {
        setStats(response.data.stats);
      } else {
        // Calculate stats on frontend as fallback
        const calculatedStats = {
          total: response.data.issues.length,
          reported: response.data.issues.filter(issue => issue.status === 'reported').length,
          under_review: response.data.issues.filter(issue => issue.status === 'under_review').length,
          approved: response.data.issues.filter(issue => issue.status === 'approved').length,
          in_progress: response.data.issues.filter(issue => issue.status === 'in_progress').length,
          resolved: response.data.issues.filter(issue => issue.status === 'resolved').length,
          rejected: response.data.issues.filter(issue => issue.status === 'rejected').length
        };
        setStats(calculatedStats);
      }
      
      setUserDepartment(response.data.userDepartment || user?.department || 'admin');
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateIssueStatus = async (issueId, newStatus) => {
    try {
      await axios.patch(`/admin/issues/${issueId}/status`, { status: newStatus });
      fetchIssues(); // Refresh the list
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status: ' + (error.response?.data?.message || error.message));
    }
  };

  const updateIssuePriority = async (issueId, newPriority) => {
    try {
      await axios.patch(`/admin/issues/${issueId}/priority`, { priority: newPriority });
      fetchIssues();
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error updating priority: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      category: '',
      priority: ''
    });
  };

  const getStatusColor = (status) => {
    const statusObj = statusOptions.find(s => s.value === status);
    return statusObj ? statusObj.color : '#6c757d';
  };

  const getPriorityColor = (priority) => {
    const priorityObj = priorityOptions.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : '#6c757d';
  };

  const getDepartmentDisplayName = (dept) => {
    return departmentDisplayNames[dept] || dept;
  };

  // Filter category options based on user's department
  const getFilteredCategoryOptions = () => {
    if (user?.role === 'admin') {
      return categoryOptions; // Admin sees all categories
    }
    
    const departmentCategories = {
      'public_works': ['pothole', 'road_damage', 'drainage'],
      'electrical': ['streetlight'],
      'sanitation': ['garbage'],
      'water_dept': ['water_leak'],
      'other': ['other']
    };
    
    const userDept = user?.department || 'other';
    const allowedCategories = departmentCategories[userDept] || ['other'];
    
    return categoryOptions.filter(option => 
      allowedCategories.includes(option.value)
    );
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
            Loading admin dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>🚀 Admin Dashboard</h1>
          <p>Welcome back, <strong>{user?.name}</strong> ({user?.role}) - Department Management Panel</p>
          
          {/* Department Information */}
          <div className="department-info">
            <span className="department-badge">
              Department: <strong>{getDepartmentDisplayName(userDepartment)}</strong>
            </span>
            {user?.role === 'department_staff' && (
              <span className="department-notice">
                🔒 You can only view and manage issues from your department
              </span>
            )}
          </div>
        </div>

        {/* Statistics Cards - UPDATED WITH ALL STATUSES */}
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <h3>Total Issues</h3>
              <div className="stat-number">{stats.total}</div>
              <small>In your department</small>
            </div>
          </div>
          
          <div className="stat-card reported">
            <div className="stat-icon">📝</div>
            <div className="stat-content">
              <h3>Reported</h3>
              <div className="stat-number">{stats.reported}</div>
              <small>New issues</small>
            </div>
          </div>
          
          <div className="stat-card review">
            <div className="stat-icon">🔍</div>
            <div className="stat-content">
              <h3>Under Review</h3>
              <div className="stat-number">{stats.under_review}</div>
              <small>Being assessed</small>
            </div>
          </div>
          
          <div className="stat-card approved">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>Approved</h3>
              <div className="stat-number">{stats.approved}</div>
              <small>Ready for work</small>
            </div>
          </div>
          
          <div className="stat-card progress">
            <div className="stat-icon">🚧</div>
            <div className="stat-content">
              <h3>In Progress</h3>
              <div className="stat-number">{stats.in_progress}</div>
              <small>Work ongoing</small>
            </div>
          </div>
          
          <div className="stat-card resolved">
            <div className="stat-icon">🏁</div>
            <div className="stat-content">
              <h3>Resolved</h3>
              <div className="stat-number">{stats.resolved}</div>
              <small>Completed</small>
            </div>
          </div>
          
          <div className="stat-card rejected">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <h3>Rejected</h3>
              <div className="stat-number">{stats.rejected}</div>
              <small>Not applicable</small>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="filters-section">
          <h3> Filters & Controls</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Status:</label>
              <select 
                value={filters.status} 
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Category:</label>
              <select 
                value={filters.category} 
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {getFilteredCategoryOptions().map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Priority:</label>
              <select 
                value={filters.priority} 
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                {priorityOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button onClick={clearFilters} className="btn btn-secondary">
              🗑️ Clear Filters
            </button>
          </div>
        </div>

        {/* Issues Management Table */}
        <div className="issues-table-container">
          <div className="table-header">
            <h2> Issues Management</h2>
            <div className="table-summary">
              Showing {issues.length} issues from your department
            </div>
          </div>
          <div className="table-responsive">
            <table className="issues-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title & Description</th>
                  <th>Category</th>
                  <th>Reporter</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Reported Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="no-issues">
                      {filters.status || filters.category || filters.priority ? (
                        <>
                          📭 No issues found matching your filters.
                          <br />
                          <button onClick={clearFilters} className="btn-link">
                            Clear filters to see all issues
                          </button>
                        </>
                      ) : (
                        <>
                          📭 No issues found in your department.
                          <br />
                          <small>New issues will appear here when reported by citizens</small>
                        </>
                      )}
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <tr key={issue._id} className="issue-row">
                      <td className="issue-id">{issue._id.substring(18)}</td>
                      <td>
                        <div className="issue-title-desc">
                          <strong>{issue.title}</strong>
                          <p>{issue.description.substring(0, 80)}...</p>
                        </div>
                      </td>
                      <td>
                        <span className={`category-badge category-${issue.category}`}>
                          {issue.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="reporter-info">
                          <strong>{issue.reportedBy?.name}</strong>
                          <br />
                          <small>{issue.reportedBy?.email}</small>
                        </div>
                      </td>
                      <td className="location-cell">
                        <span className="location-icon">📍</span>
                        {issue.location?.address || 'No address'}
                      </td>
                      <td>
                        <select 
                          value={issue.status} 
                          onChange={(e) => updateIssueStatus(issue._id, e.target.value)}
                          className="status-select"
                          style={{ 
                            borderColor: getStatusColor(issue.status),
                            color: getStatusColor(issue.status)
                          }}
                        >
                          {statusOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select 
                          value={issue.priority} 
                          onChange={(e) => updateIssuePriority(issue._id, e.target.value)}
                          className="priority-select"
                          style={{ color: getPriorityColor(issue.priority) }}
                        >
                          {priorityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="date-cell">
                        {new Date(issue.createdAt).toLocaleDateString()}
                        <br />
                        <small>{new Date(issue.createdAt).toLocaleTimeString()}</small>
                      </td>
                      <td>
                        <button 
                          className="btn-view"
                          onClick={() => window.location.href = `/issue/${issue._id}`}
                        >
                          👁️ View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;