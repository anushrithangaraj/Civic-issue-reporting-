import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './IssueDetails.css';

// Fix for default markers
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const IssueDetails = () => {
  const { id } = useParams();
  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchIssueDetails();
  }, [id]);

  const fetchIssueDetails = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/issues/${id}`);
      setIssue(response.data);
    } catch (error) {
      console.error('Error fetching issue details:', error);
      setError('Issue not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setAddingComment(true);
    try {
      const response = await axios.post(`http://localhost:5000/api/issues/${id}/comments`, {
        text: newComment
      });
      setIssue(response.data);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Failed to add comment.');
    } finally {
      setAddingComment(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusConfig = {
      reported: { class: 'status-reported', text: 'Reported', icon: 'fas fa-flag' },
      under_review: { class: 'status-under-review', text: 'Under Review', icon: 'fas fa-search' },
      approved: { class: 'status-approved', text: 'Approved', icon: 'fas fa-check-circle' },
      in_progress: { class: 'status-in-progress', text: 'In Progress', icon: 'fas fa-tools' },
      resolved: { class: 'status-resolved', text: 'Resolved', icon: 'fas fa-check-double' },
      rejected: { class: 'status-rejected', text: 'Rejected', icon: 'fas fa-times-circle' }
    };
    return statusConfig[status] || statusConfig.reported;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="issue-details">
        <div className="container">
          <div className="loading">Loading issue details...</div>
        </div>
      </div>
    );
  }

  if (error || !issue) {
    return (
      <div className="issue-details">
        <div className="container">
          <div className="error-state">
            <i className="fas fa-exclamation-triangle"></i>
            <h2>Issue Not Found</h2>
            <p>{error || 'The requested issue could not be found.'}</p>
            <Link to="/map" className="btn btn-primary">Back to Map</Link>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(issue.status);

  return (
    <div className="issue-details">
      <div className="container">
        {/* Header */}
        <div className="issue-header">
          <div className="breadcrumb">
            <Link to="/map">← Back to Map</Link>
          </div>
          <div className="header-content">
            <h1>{issue.title}</h1>
            <div className="header-meta">
              <span className={`status-badge ${statusInfo.class}`}>
                <i className={statusInfo.icon}></i>
                {statusInfo.text}
              </span>
              <span className="issue-id">ID: {issue._id}</span>
            </div>
          </div>
        </div>

        <div className="issue-layout">
          {/* Main Content */}
          <div className="issue-main">
            {/* Issue Information */}
            <section className="info-section">
              <h2>Issue Information</h2>
              <div className="info-grid">
                <div className="info-item">
                  <label>Category:</label>
                  <span className="category-badge">{issue.category.replace('_', ' ')}</span>
                </div>
                <div className="info-item">
                  <label>Priority:</label>
                  <span className={`priority-badge priority-${issue.priority}`}>
                    {issue.priority}
                  </span>
                </div>
                <div className="info-item">
                  <label>Reported By:</label>
                  <span>{issue.reportedBy?.name || 'Anonymous'}</span>
                </div>
                <div className="info-item">
                  <label>Reported On:</label>
                  <span>{formatDate(issue.createdAt)}</span>
                </div>
                {issue.assignedTo && (
                  <div className="info-item">
                    <label>Assigned To:</label>
                    <span>{issue.assignedTo.name}</span>
                  </div>
                )}
                {issue.resolutionDetails?.resolvedAt && (
                  <div className="info-item">
                    <label>Resolved On:</label>
                    <span>{formatDate(issue.resolutionDetails.resolvedAt)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* Description */}
            <section className="description-section">
              <h2>Description</h2>
              <p>{issue.description}</p>
            </section>

            {/* Location */}
            <section className="location-section">
              <h2>Location</h2>
              <div className="location-info">
                <p><strong>Address:</strong> {issue.location?.address || 'Address not specified'}</p>
                {issue.location?.coordinates && (
                  <p><strong>Coordinates:</strong> 
                    {issue.location.coordinates.lat.toFixed(6)}, 
                    {issue.location.coordinates.lng.toFixed(6)}
                  </p>
                )}
              </div>
              {issue.location?.coordinates && (
                <div className="location-map">
                  <MapContainer
                    center={[issue.location.coordinates.lat, issue.location.coordinates.lng]}
                    zoom={15}
                    style={{ height: '300px', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker 
                      position={[issue.location.coordinates.lat, issue.location.coordinates.lng]}
                    >
                      <Popup>
                        <strong>{issue.title}</strong><br/>
                        {issue.location.address}
                      </Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}
            </section>

            {/* Images */}
            {issue.images && issue.images.length > 0 && (
              <section className="images-section">
                <h2>Photos ({issue.images.length})</h2>
                <div className="images-grid">
                  {issue.images.map((image, index) => (
                    <div key={index} className="image-item">
                      <img 
                        src={`http://localhost:5000/uploads/${image.filename}`} 
                        alt={`${issue.title} - Photo ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Comments */}
            <section className="comments-section">
              <h2>Updates & Comments ({issue.comments?.length || 0})</h2>
              
              {/* Add Comment Form */}
              {user && (
                <form onSubmit={handleAddComment} className="comment-form">
                  <div className="form-group">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add an update or comment..."
                      rows="3"
                      disabled={addingComment}
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={addingComment || !newComment.trim()}
                    className="btn btn-primary"
                  >
                    {addingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </form>
              )}

              {/* Comments List */}
              <div className="comments-list">
                {issue.comments && issue.comments.length > 0 ? (
                  issue.comments.map((comment, index) => (
                    <div key={index} className="comment-item">
                      <div className="comment-header">
                        <span className="comment-author">{comment.user?.name || 'System'}</span>
                        <span className="comment-date">{formatDate(comment.createdAt)}</span>
                        {comment.isInternal && (
                          <span className="internal-badge">Internal</span>
                        )}
                      </div>
                      <div className="comment-text">
                        {comment.text}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-comments">
                    <p>No updates or comments yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="issue-sidebar">
            {/* Status Timeline */}
            <div className="sidebar-card">
              <h3>Status Timeline</h3>
              <div className="timeline">
                <div className="timeline-item active">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>{statusInfo.text}</strong>
                    <span>Current Status</span>
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <strong>Reported</strong>
                    <span>{formatDate(issue.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {user && (user.role === 'admin' || user.role === 'department_staff') && (
              <div className="sidebar-card">
                <h3>Quick Actions</h3>
                <div className="action-buttons">
                  <button className="btn btn-secondary">Update Status</button>
                  <button className="btn btn-secondary">Assign to Me</button>
                  <button className="btn btn-primary">Mark Resolved</button>
                </div>
              </div>
            )}

            {/* Resolution Details */}
            {issue.resolutionDetails && (
              <div className="sidebar-card">
                <h3>Resolution Details</h3>
                <div className="resolution-info">
                  <p><strong>Resolved by:</strong> {issue.resolutionDetails.resolvedBy?.name || 'Unknown'}</p>
                  <p><strong>Resolution Notes:</strong> {issue.resolutionDetails.resolutionNotes}</p>
                  {issue.resolutionDetails.beforeImage && (
                    <p><strong>Before/After photos available</strong></p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssueDetails;