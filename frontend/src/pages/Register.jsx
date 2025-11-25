import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  // Get current location and auto-fill address
  const getCurrentLocation = () => {
    setLocationLoading(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      setLocationLoading(false);
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          // Reverse geocode to get address from coordinates
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            const data = await response.json();
            
            // Build address from the geocoding response
            let address = '';
            if (data.city) address += data.city;
            if (data.locality) address += `, ${data.locality}`;
            if (data.principalSubdivision) address += `, ${data.principalSubdivision}`;
            if (data.countryName) address += `, ${data.countryName}`;
            
            // If we got a valid address, update the form
            if (address) {
              setFormData(prev => ({
                ...prev,
                address: address
              }));
            } else {
              setFormData(prev => ({
                ...prev,
                address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              }));
            }
          } else {
            // Fallback if geocoding fails
            setFormData(prev => ({
              ...prev,
              address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            }));
          }
        } catch (geocodeError) {
          console.error('Geocoding error:', geocodeError);
          // Fallback to coordinates if geocoding fails
          setFormData(prev => ({
            ...prev,
            address: `Location at: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          }));
        }

        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setError('Location access denied. Please enable location permissions in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setError('Location information is unavailable. Please check your GPS or network connection.');
            break;
          case error.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('An unknown error occurred while getting location.');
            break;
        }
      },
      options
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
      phone: formData.phone || '',
      address: formData.address || ''
    });

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="register">
      <div className="container">
        <div className="register-container">
          <h1>Create an Account</h1>
          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Enter your email address"
              />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number (Optional)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={loading}
                placeholder="Enter your phone number"
              />
            </div>
            
            {/* Address Field with Location Button */}
            <div className="form-group">
              <label htmlFor="address">
                Location Address (Optional) 
                <span className="optional-label"> - Helps us serve your area better</span>
              </label>
              <div className="address-input-group">
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={loading || locationLoading}
                  placeholder="Your current location will help us serve your area better"
                />
                <button 
                  type="button" 
                  onClick={getCurrentLocation} 
                  className="location-btn"
                  disabled={loading || locationLoading}
                >
                  {locationLoading ? (
                    <>
                      <span className="spinner"></span> Getting Location...
                    </>
                  ) : (
                    <>
                      📍 Use Current Location
                    </>
                  )}
                </button>
              </div>
              {formData.address && (
                <p className="location-hint">
                  ✅ Location detected: {formData.address}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
                minLength="6"
                placeholder="Enter a password (min. 6 characters)"
              />
              <small>Password must be at least 6 characters long</small>
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
                placeholder="Confirm your password"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || locationLoading} 
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <div className="register-links">
            <p>Already have an account? <Link to="/login">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;