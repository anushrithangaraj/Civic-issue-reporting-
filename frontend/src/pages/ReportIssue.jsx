import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import potholeDetector from '../services/potholeDetection';
import './ReportIssue.css';
import EXIF from 'exif-js';

const ReportIssue = () => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        address: '',
        lat: '',
        lng: ''
    });
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [cameraActive, setCameraActive] = useState(false);
    const [locationLoading, setLocationLoading] = useState(false);
    const [detectionResult, setDetectionResult] = useState(null);
    const [detecting, setDetecting] = useState(false);
    const [gpsData, setGpsData] = useState(null);
    
    // ADD THIS MISSING STATE VARIABLE
    const [detectionHistory, setDetectionHistory] = useState([]);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const { user } = useAuth();
    const navigate = useNavigate();

    const categories = [
        { value: 'pothole', label: 'Pothole' },
        { value: 'streetlight', label: 'Broken Streetlight' },
        { value: 'garbage', label: 'Garbage Overflow' },
        { value: 'water_leak', label: 'Water Leak' },
        { value: 'road_damage', label: 'Road Damage' },
        { value: 'drainage', label: 'Drainage Issue' },
        { value: 'other', label: 'Other' }
    ];

    // Initialize detector on component mount
    useEffect(() => {
        const initializeDetector = async () => {
            const success = await potholeDetector.loadModel();
            if (success) {
                console.log('🤖 AI Pothole Detector ready');
            }
        };
        initializeDetector();
    }, []);

    // Clean up camera stream on component unmount
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    // Get high-precision GPS coordinates
    const getHighPrecisionLocation = async () => {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    resolve({
                        lat: latitude,
                        lng: longitude,
                        accuracy: accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    reject(error);
                },
                options
            );
        });
    };

    // Add GPS metadata to image
    const addGPSMetadataToImage = async (imageFile, gpsData) => {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(imageFile);
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const newFile = new File([blob], `gps_photo_${Date.now()}.jpg`, {
                        type: 'image/jpeg',
                        lastModified: new Date().getTime()
                    });
                    
                    const enhancedFile = {
                        file: newFile,
                        metadata: {
                            gps: gpsData,
                            timestamp: new Date().toISOString(),
                            address: formData.address || 'Unknown location'
                        }
                    };
                    
                    URL.revokeObjectURL(url);
                    resolve(enhancedFile);
                }, 'image/jpeg', 0.95);
            };
            
            img.src = url;
        });
    };

    const detectPotholeInImage = async (imageFile) => {
        setDetecting(true);
        setDetectionResult(null);
        
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(imageFile);
            
            img.onload = async () => {
                try {
                    // First validate if image is suitable
                    const validation = await potholeDetector.validateImageForPotholeDetection(img);
                    
                    if (!validation.isValid) {
                        setDetectionResult({
                            isPothole: false,
                            confidence: 0.1,
                            features: {
                                roadSurfacePercentage: validation.roadPercentage,
                                darkClusters: 0,
                                potentialPixels: 0,
                                edgeIntensity: 0,
                                analysis: validation.recommendation,
                                imageType: "non-road"
                            },
                            recommendations: "Please capture a clear photo of the road surface for accurate detection.",
                            isRoadImage: false
                        });
                        setError(validation.recommendation);
                        resolve(null);
                        return;
                    }

                    const result = await potholeDetector.detectPothole(img);
                    setDetectionResult(result);
                    
                    // Add to detection history - NOW THIS WILL WORK
                    setDetectionHistory(prev => [...prev, {
                        timestamp: new Date().toISOString(),
                        result: result,
                        imageName: imageFile.name
                    }]);

                    if (result.isRoadImage && result.isPothole && result.confidence > 0.6) {
                        setFormData(prev => ({
                            ...prev,
                            category: 'pothole',
                            title: prev.title || `Pothole Detected (${Math.round(result.confidence * 100)}% confidence)`,
                            description: prev.description || `AI-detected pothole with ${Math.round(result.confidence * 100)}% confidence. ${result.features.analysis}`
                        }));
                        setSuccess(`✅ AI detected: POTHOLE (${Math.round(result.confidence * 100)}% confidence)`);
                    } else if (result.isRoadImage) {
                        setSuccess(`🔍 ${result.features.analysis}`);
                    } else {
                        setError(result.features.analysis);
                    }
                    
                    resolve(result);
                } catch (error) {
                    console.error('Detection error:', error);
                    setError('AI analysis failed. Please try again.');
                    resolve(null);
                } finally {
                    URL.revokeObjectURL(url);
                    setDetecting(false);
                }
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                setDetecting(false);
                setError('Failed to load image for analysis.');
                resolve(null);
            };
            
            img.src = url;
        });
    };

    // Start camera for live photo capture
    const startCamera = async () => {
        try {
            setError('');
            setCameraActive(true);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(err => {
                        console.error('Error playing video:', err);
                        setError('Camera failed to start. Please try again.');
                        setCameraActive(false);
                    });
                };
            }
        } catch (err) {
            console.error('Camera error:', err);
            setError('Camera access denied or not available. Please check permissions.');
            setCameraActive(false);
        }
    };

    // Stop camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    };

    // Capture photo from camera with AI analysis
    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) {
            setError('Camera not ready. Please try again.');
            return;
        }

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (video.videoWidth === 0 || video.videoHeight === 0) {
            setError('Camera not ready. Please wait for camera to initialize.');
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        try {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob(async (blob) => {
                if (blob) {
                    const file = new File([blob], `pothole_photo_${Date.now()}.jpg`, { 
                        type: 'image/jpeg' 
                    });
                    
                    setImages(prev => [...prev, file]);
                    setSuccess('📸 Photo captured! AI analysis starting...');
                    
                    // Automatically detect potholes in the captured image
                    await detectPotholeInImage(file);
                } else {
                    setError('Failed to capture photo. Please try again.');
                }
            }, 'image/jpeg', 0.8);
        } catch (err) {
            console.error('Capture error:', err);
            setError('Error capturing photo. Please try again.');
        }
    };

    // Get current location with address auto-fill
    const getCurrentLocation = async () => {
        setLocationLoading(true);
        setError('');

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by this browser.');
            setLocationLoading(false);
            return;
        }

        const options = {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 60000
        };

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, options);
            });

            const { latitude, longitude } = position.coords;
            
            setFormData(prev => ({
                ...prev,
                lat: latitude.toString(),
                lng: longitude.toString()
            }));

            try {
                const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                
                if (response.ok) {
                    const data = await response.json();
                    
                    let addressParts = [];
                    if (data.locality) addressParts.push(data.locality);
                    if (data.city) addressParts.push(data.city);
                    if (data.principalSubdivision) addressParts.push(data.principalSubdivision);
                    if (data.countryName) addressParts.push(data.countryName);
                    
                    const fullAddress = addressParts.join(', ');
                    
                    if (fullAddress) {
                        setFormData(prev => ({
                            ...prev,
                            address: fullAddress
                        }));
                        setSuccess('📍 Location detected successfully!');
                    } else {
                        setFormData(prev => ({
                            ...prev,
                            address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                        }));
                    }
                }
            } catch (geocodeError) {
                console.log('Geocoding failed, using coordinates:', geocodeError);
                setFormData(prev => ({
                    ...prev,
                    address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                }));
            }

        } catch (error) {
            console.error('Location error:', error);
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setError('Location access denied. Please enable location permissions.');
                    break;
                case error.POSITION_UNAVAILABLE:
                    setError('Location information unavailable.');
                    break;
                case error.TIMEOUT:
                    setError('Location request timed out. Please try again.');
                    break;
                default:
                    setError('An unknown error occurred while getting location.');
                    break;
            }
        } finally {
            setLocationLoading(false);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        if (error) setError('');
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length + images.length > 5) {
            setError('Maximum 5 photos allowed. Please select fewer files.');
            return;
        }
        
        setImages(prev => [...prev, ...files]);
        setError('');
        
        // Detect potholes in the first uploaded image
        if (files.length > 0) {
            setSuccess('📁 Photo uploaded! AI analysis starting...');
            await detectPotholeInImage(files[0]);
        }
    };

    const removeImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        // Clear detection result if removing the analyzed image
        if (index === 0) {
            setDetectionResult(null);
        }
    };

    // AI Detection Result Display Component
    const DetectionResultDisplay = () => {
        if (!detectionResult) return null;

        const confidencePercentage = Math.round(detectionResult.confidence * 100);
        const isHighConfidence = detectionResult.confidence > 0.6;
        const isRoadImage = detectionResult.isRoadImage;

        return (
            <div className={`detection-result ${!isRoadImage ? 'non-road' : detectionResult.isPothole ? 'pothole-detected' : 'no-pothole'} ${isHighConfidence ? 'high-confidence' : ''}`}>
                <div className="detection-header">
                    <h4>
                        {!isRoadImage ? '❌ Invalid Image' : detectionResult.isPothole ? '🚧 POTHOLE DETECTED' : '✅ Road Clear'}
                        <span className="confidence-badge">{confidencePercentage}%</span>
                    </h4>
                    <span className={`road-status ${isRoadImage ? 'valid-road' : 'invalid-road'}`}>
                        {isRoadImage ? '🛣️ Valid Road Image' : '❌ Poor Road Visibility'}
                    </span>
                </div>
                
                <div className="confidence-visualization">
                    <div className="confidence-bar">
                        <div 
                            className="confidence-fill"
                            style={{ width: `${confidencePercentage}%` }}
                        ></div>
                        <span className="confidence-text">Detection Confidence: {confidencePercentage}%</span>
                    </div>
                </div>
                
                <div className="detection-details">
                    <div className="feature-analysis">
                        <h5>📊 Road Analysis:</h5>
                        <div className="feature-grid">
                            <div className="feature-item">
                                <span className="feature-label">Road Surface:</span>
                                <span className="feature-value">{detectionResult.features.roadSurfacePercentage}%</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-label">Dark Areas:</span>
                                <span className="feature-value">{detectionResult.features.potentialPixels}%</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-label">Potential Potholes:</span>
                                <span className="feature-value">{detectionResult.features.darkClusters}</span>
                            </div>
                            <div className="feature-item">
                                <span className="feature-label">Edge Intensity:</span>
                                <span className="feature-value">{detectionResult.features.edgeIntensity}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="analysis-result">
                        <h5>🔍 Analysis Result:</h5>
                        <p>{detectionResult.features.analysis}</p>
                        <p className="image-type">Image Type: {detectionResult.features.imageType}</p>
                    </div>
                    
                    <div className="ai-recommendation">
                        <h5>💡 AI Recommendation:</h5>
                        <p>{detectionResult.recommendations}</p>
                    </div>
                </div>
                
                {isRoadImage && detectionResult.isPothole && detectionResult.confidence > 0.4 && (
                    <div className="auto-action">
                        <div className="auto-category">
                            <i className="fas fa-robot"></i>
                            <span>Suggested Category: <strong>POTHOLE</strong></span>
                        </div>
                        <button 
                            type="button" 
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    category: 'pothole',
                                    title: `Pothole Detected (${confidencePercentage}% confidence)`,
                                    description: `AI-detected pothole with ${confidencePercentage}% confidence. ${detectionResult.features.analysis}`
                                }));
                            }}
                            className="btn btn-sm btn-success"
                        >
                            Apply AI Suggestions
                        </button>
                    </div>
                )}

                {!isRoadImage && (
                    <div className="image-help">
                        <h6>📸 Tips for Better Detection:</h6>
                        <ul>
                            <li>Capture the road surface clearly</li>
                            <li>Ensure good lighting conditions</li>
                            <li>Avoid capturing too much sky or buildings</li>
                            <li>Focus on the damaged area</li>
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    // Detection History Component - NOW THIS WILL WORK
    const DetectionHistory = () => {
        if (detectionHistory.length === 0) return null;

        return (
            <div className="detection-history">
                <h5>📋 Analysis History</h5>
                <div className="history-list">
                    {detectionHistory.slice(-3).reverse().map((item, index) => (
                        <div key={index} className="history-item">
                            <span className="history-time">
                                {new Date(item.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={`history-result ${item.result.isPothole ? 'pothole' : 'clear'}`}>
                                {item.result.isPothole ? '🚧 Pothole' : '✅ Clear'}
                            </span>
                            <span className="history-confidence">
                                {Math.round(item.result.confidence * 100)}%
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        // Validation
        if (!formData.title.trim() || !formData.description.trim() || !formData.category) {
            setError('Please fill in all required fields');
            setLoading(false);
            return;
        }

        if (!formData.address.trim()) {
            setError('Please provide a location address');
            setLoading(false);
            return;
        }

        if (images.length === 0) {
            setError('Please add at least one photo');
            setLoading(false);
            return;
        }

        try {
            const submitData = new FormData();
            
            submitData.append('title', formData.title.trim());
            submitData.append('description', formData.description.trim());
            submitData.append('category', formData.category);
            submitData.append('address', formData.address.trim());
            submitData.append('lat', formData.lat || '0');
            submitData.append('lng', formData.lng || '0');
            
            // Add AI detection results as metadata
            if (detectionResult) {
                submitData.append('ai_detection', JSON.stringify({
                    isPothole: detectionResult.isPothole,
                    confidence: detectionResult.confidence,
                    features: detectionResult.features
                }));
            }
            
            images.forEach(image => {
                submitData.append('images', image);
            });

            const response = await axios.post('http://localhost:5000/api/issues', submitData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 30000
            });

            if (response.data.success || response.data.message) {
                setSuccess('✅ Issue reported successfully with AI analysis! Redirecting...');
                
                // Reset form
                setFormData({
                    title: '',
                    description: '',
                    category: '',
                    address: '',
                    lat: '',
                    lng: ''
                });
                setImages([]);
                setDetectionResult(null);
                setDetectionHistory([]);
                
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            } else {
                setSuccess('✅ Issue reported successfully! Redirecting...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 2000);
            }
        } catch (error) {
            console.error('Submission error:', error);
            
            if (error.response) {
                const errorMessage = error.response.data.message || 
                                   error.response.data.error ||
                                   'Failed to report issue. Please try again.';
                setError(errorMessage);
            } else if (error.request) {
                setError('Network error. Please check your connection and try again.');
            } else {
                setError('An unexpected error occurred. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="report-issue">
            <div className="container">
                <h1>
                    <i className="fas fa-robot"></i> Report Civic Issue with AI Detection
                </h1>
                
                {success && (
                    <div className="success-message">
                        <i className="fas fa-check-circle"></i>
                        <div>
                            <strong>Success!</strong>
                            <p>{success}</p>
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i>
                        <div>
                            <strong>Error!</strong>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="issue-form">
                    {/* AI Camera Section */}
                    <div className="camera-section">
                        <h3>
                            <i className="fas fa-camera"></i> Live AI Photo Analysis
                            <span className="ai-badge">Powered by TensorFlow.js</span>
                        </h3>
                        
                        <div className="camera-controls">
                            {!cameraActive ? (
                                <button 
                                    type="button" 
                                    onClick={startCamera} 
                                    className="btn btn-primary camera-btn"
                                    disabled={loading || detecting}
                                >
                                    <i className="fas fa-camera"></i> Open AI Camera
                                </button>
                            ) : (
                                <div className="camera-active">
                                    <video 
                                        ref={videoRef} 
                                        autoPlay 
                                        playsInline 
                                        className="camera-preview"
                                        muted
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                    <div className="camera-buttons">
                                        <button 
                                            type="button" 
                                            onClick={capturePhoto} 
                                            className="btn btn-success capture-btn"
                                            disabled={detecting}
                                        >
                                            {detecting ? (
                                                <>
                                                    <i className="fas fa-spinner fa-spin"></i> AI Analyzing...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="fas fa-camera"></i> Capture & Analyze
                                                </>
                                            )}
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={stopCamera} 
                                            className="btn btn-secondary"
                                        >
                                            <i className="fas fa-times"></i> Close Camera
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
                    </div>

                    {/* AI Detection Results */}
                    <DetectionResultDisplay />

                    {/* File Upload with AI */}
                    <div className="form-group">
                        <label htmlFor="images">
                            <i className="fas fa-upload"></i> Upload Photos for AI Analysis (Max 5)
                            <span className="ai-badge">🤖 Auto-Detect Potholes</span>
                        </label>
                        <input
                            type="file"
                            id="images"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={loading || detecting}
                        />
                        <small>First image will be automatically analyzed for potholes using advanced AI</small>
                    </div>

                    {/* Image Preview */}
                    {images.length > 0 && (
                        <div className="image-preview-section">
                            <h4>
                                <i className="fas fa-images"></i> Captured Photos ({images.length}/5)
                                {detecting && <span className="analyzing-badge">AI Analyzing...</span>}
                            </h4>
                            <div className="image-preview-grid">
                                {images.map((image, index) => (
                                    <div key={index} className="image-preview-item">
                                        <img src={URL.createObjectURL(image)} alt={`Preview ${index + 1}`} />
                                        {index === 0 && detectionResult && (
                                            <div className={`ai-indicator ${detectionResult.isPothole ? 'pothole' : 'clear'}`}>
                                                {detectionResult.isPothole ? '🚧' : '✅'}
                                            </div>
                                        )}
                                        <button 
                                            type="button" 
                                            onClick={() => removeImage(index)} 
                                            className="remove-image"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Detection History - NOW THIS WILL WORK */}
                    <DetectionHistory />

                    {/* Issue Details */}
                    <div className="form-section">
                        <h3><i className="fas fa-info-circle"></i> Issue Details</h3>
                        
                        <div className="form-group">
                            <label htmlFor="title">Issue Title *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                                placeholder="e.g., Large pothole on main road"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="category">Category *</label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                required
                                disabled={loading}
                            >
                                <option value="">Select a category</option>
                                {categories.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="description">Description *</label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows="4"
                                required
                                disabled={loading}
                                placeholder="Please provide detailed information about the issue..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="address">Location Address *</label>
                            <input
                                type="text"
                                id="address"
                                name="address"
                                value={formData.address}
                                onChange={handleInputChange}
                                required
                                disabled={loading || locationLoading}
                                placeholder="Street address where the issue is located"
                            />
                            <button 
                                type="button" 
                                onClick={getCurrentLocation} 
                                className="location-btn"
                                disabled={loading || locationLoading}
                            >
                                {locationLoading ? (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Detecting Location...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-location-arrow"></i> Use Current Location
                                    </>
                                )}
                            </button>
                            {formData.lat && formData.lng && (
                                <p className="location-coordinates">
                                    <i className="fas fa-map-marker-alt"></i> 
                                    Coordinates: {formData.lat}, {formData.lng}
                                </p>
                            )}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || detecting} 
                        className={`submit-btn ${loading ? 'loading' : ''}`}
                    >
                        {loading ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i> Reporting Issue...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-paper-plane"></i> Report Issue with AI Analysis
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReportIssue;