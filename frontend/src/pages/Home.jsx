import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Home.css';

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1>Report Civic Issues. Make a Difference.</h1>
            <p>Help improve your community by reporting issues like potholes, broken streetlights, and garbage problems.</p>
            <div className="hero-buttons">
              {user ? (
                <Link to="/report" className="btn btn-primary">
                  Report an Issue
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn btn-primary">
                    Get Started
                  </Link>
                  <Link to="/map" className="btn btn-secondary">
                    View Issues Map
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>How It Works</h2>
          <div className="features-grid">
            <div className="feature-card">
              <i className="fas fa-map-marker-alt"></i>
              <h3>Report Issues</h3>
              <p>Use our mobile app or website to report civic issues with photos and location details.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-bullhorn"></i>
              <h3>Track Progress</h3>
              <p>Monitor the status of your reports and receive updates until resolution.</p>
            </div>
            <div className="feature-card">
              <i className="fas fa-chart-line"></i>
              <h3>Transparent Process</h3>
              <p>View all reported issues on our interactive map and see what's being fixed.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;