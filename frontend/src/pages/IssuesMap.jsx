import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './IssuesMap.css';

// Fix for default markers in react-leaflet
delete Icon.Default.prototype._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons for different issue categories
const createCustomIcon = (category) => {
  const colors = {
    pothole: '#ff6b6b',
    streetlight: '#feca57',
    garbage: '#10ac84',
    water_leak: '#2e86de',
    road_damage: '#ee5a24',
    drainage: '#5f27cd',
    other: '#8395a7'
  };

  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
        <path fill="${colors[category] || '#8395a7'}" d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
        <circle cx="12.5" cy="12.5" r="6" fill="white"/>
      </svg>
    `)}`,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41]
  });
};

// Component to handle map bounds
const MapController = ({ issues }) => {
  const map = useMap();
  
  useEffect(() => {
    if (issues.length > 0) {
      const group = new L.featureGroup(issues.map(issue => 
        L.marker([issue.location.coordinates.lat, issue.location.coordinates.lng])
      ));
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [issues, map]);

  return null;
};

const IssuesMap = () => {
  const [allIssues, setAllIssues] = useState([]); // Store ALL issues from API
  const [filteredIssues, setFilteredIssues] = useState([]); // Store filtered issues for display
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    ownership: 'all' // New filter: 'all' or 'my'
  });
  const { user } = useAuth();

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'pothole', label: 'Potholes' },
    { value: 'streetlight', label: 'Streetlights' },
    { value: 'garbage', label: 'Garbage' },
    { value: 'water_leak', label: 'Water Leaks' },
    { value: 'road_damage', label: 'Road Damage' },
    { value: 'drainage', label: 'Drainage' },
    { value: 'other', label: 'Other' }
  ];

  const statuses = [
    { value: 'all', label: 'All Statuses' },
    { value: 'reported', label: 'Reported' },
    { value: 'under_review', label: 'Under Review' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'resolved', label: 'Resolved' }
  ];

  const ownershipOptions = [
    { value: 'all', label: 'All Reports' },
    { value: 'my', label: 'My Reports Only' }
  ];

  useEffect(() => {
    fetchAllIssues();
  }, []);

  // Fetch all issues once when component mounts
  const fetchAllIssues = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/issues?limit=1000');
      setAllIssues(response.data.issues);
      setFilteredIssues(response.data.issues); // Initially show all issues
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply filters whenever filters state changes
  useEffect(() => {
    applyFilters();
  }, [filters, allIssues, user]);

  const applyFilters = () => {
    let filtered = [...allIssues]; // Start with ALL issues, not previously filtered ones

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(issue => issue.category === filters.category);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(issue => issue.status === filters.status);
    }

    // Apply ownership filter - FIXED: Check if user exists and compare IDs properly
    if (filters.ownership === 'my' && user) {
      filtered = filtered.filter(issue => 
        issue.reportedBy && issue.reportedBy._id === user._id
      );
    }

    setFilteredIssues(filtered);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const getStatusColor = (status) => {
    const colors = {
      reported: '#ff9f43',
      under_review: '#2e86de',
      in_progress: '#feca57',
      resolved: '#10ac84',
      rejected: '#ee5a24'
    };
    return colors[status] || '#8395a7';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="issues-map">
        <div className="container">
          <div className="loading">Loading map...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="issues-map">
      <div className="container">
        <div className="map-header">
          <h1>Issues Map</h1>
          <p>View all reported civic issues on the interactive map</p>
        </div>

        {/* Filters */}
        <div className="map-filters">
          <div className="filter-group">
            <label htmlFor="category">Category:</label>
            <select 
              id="category"
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="status">Status:</label>
            <select 
              id="status"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              {statuses.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* NEW: Ownership Filter */}
          <div className="filter-group">
            <label htmlFor="ownership">Show:</label>
            <select 
              id="ownership"
              value={filters.ownership}
              onChange={(e) => handleFilterChange('ownership', e.target.value)}
            >
              {ownershipOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="map-stats">
            <span>{filteredIssues.length} issues found</span>
          </div>
        </div>

        {/* Map Container */}
        <div className="map-container">
          <MapContainer 
            center={[11.3410, 77.7172]} // Default to Tirupur coordinates
            zoom={13}
            style={{ height: '600px', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapController issues={filteredIssues} />
            
            {filteredIssues.map(issue => (
              <Marker
                key={issue._id}
                position={[issue.location.coordinates.lat, issue.location.coordinates.lng]}
                icon={createCustomIcon(issue.category)}
              >
                <Popup>
                  <div className="issue-popup">
                    <h3>{issue.title}</h3>
                    <div className="popup-meta">
                      <span className="category-badge">{issue.category.replace('_', ' ')}</span>
                      <span 
                        className="status-badge"
                        style={{backgroundColor: getStatusColor(issue.status)}}
                      >
                        {issue.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="popup-description">{issue.description}</p>
                    <div className="popup-details">
                      <p><strong>Location:</strong> {issue.location?.address}</p>
                      <p><strong>Reported:</strong> {formatDate(issue.createdAt)}</p>
                      <p><strong>By:</strong> {issue.reportedBy?.name || 'Anonymous'}</p>
                    </div>
                    {issue.images && issue.images.length > 0 && (
                      <div className="popup-images">
                        <img 
                          src={`http://localhost:5000/uploads/${issue.images[0].filename}`} 
                          alt={issue.title}
                          style={{maxWidth: '100%', maxHeight: '150px'}}
                        />
                      </div>
                    )}
                    <a href={`/issue/${issue._id}`} className="view-details-btn">
                      View Details
                    </a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="map-legend">
          <h4>Legend</h4>
          <div className="legend-items">
            {categories.filter(cat => cat.value !== 'all').map(cat => (
              <div key={cat.value} className="legend-item">
                <span 
                  className="legend-color"
                  style={{
                    backgroundColor: createCustomIcon(cat.value).options.iconUrl.includes(cat.value) 
                      ? '' 
                      : '#8395a7'
                  }}
                ></span>
                <span>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IssuesMap;