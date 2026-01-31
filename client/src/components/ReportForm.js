import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { UW_BUILDINGS, BUILDING_SIDES } from '../data/buildings';
import { isMobile, getCurrentLocation, takePhoto, pickPhoto } from '../utils/mobile';
import './ReportForm.css';

// Use relative URL in production (same server), absolute URL in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

function ReportForm({ reportType, onSuccess, onCancel, campusBounds, selectedLocation, onLocationClear }) {
  const [locationMethod, setLocationMethod] = useState('map'); // 'map' or 'building'
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [buildingSide, setBuildingSide] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Update coordinates when location is selected from map
  useEffect(() => {
    if (selectedLocation) {
      setLatitude(selectedLocation.latitude.toString());
      setLongitude(selectedLocation.longitude.toString());
      setLocationMethod('map');
    }
  }, [selectedLocation]);

  // Update coordinates when building is selected
  useEffect(() => {
    if (selectedBuilding && locationMethod === 'building') {
      const building = UW_BUILDINGS.find(b => b.id === selectedBuilding);
      if (building) {
        // Adjust coordinates slightly based on building side
        let lat = building.lat;
        let lng = building.lng;
        const offset = 0.0002; // Small offset for building sides
        
        switch (buildingSide) {
          case 'north':
            lat += offset;
            break;
          case 'south':
            lat -= offset;
            break;
          case 'east':
            lng += offset;
            break;
          case 'west':
            lng -= offset;
            break;
          default:
            break;
        }
        
        setLatitude(lat.toString());
        setLongitude(lng.toString());
      }
    }
  }, [selectedBuilding, buildingSide, locationMethod]);


  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setError('');
      const file = await takePhoto();
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          return;
        }
        setImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError(err.message || 'Failed to take photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      setError('');
      const file = await pickPhoto();
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          setError('Image size must be less than 5MB');
          return;
        }
        setImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError(err.message || 'Failed to pick photo');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (locationMethod === 'building' && !selectedBuilding) {
      setError('Please select a building');
      return;
    }

    if (!latitude || !longitude) {
      setError('Please select a location on the map or choose a building');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('type', reportType);
      formData.append('latitude', latitude);
      formData.append('longitude', longitude);
      
      // Add building info to description if building was selected
      let fullDescription = description;
      if (locationMethod === 'building' && selectedBuilding) {
        const building = UW_BUILDINGS.find(b => b.id === selectedBuilding);
        const side = BUILDING_SIDES.find(s => s.value === buildingSide);
        const buildingInfo = building ? `${building.name}${side ? ` - ${side.label}` : ''}` : '';
        if (buildingInfo) {
          fullDescription = buildingInfo + (description ? `\n\n${description}` : '');
        }
      }
      
      formData.append('description', fullDescription);
      formData.append('severity', severity);
      if (image) {
        formData.append('image', image);
      }

      await axios.post(`${API_BASE_URL}/reports`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        // Reset form
        setLocationMethod('map');
        setSelectedBuilding('');
        setBuildingSide('');
        setLatitude('');
        setLongitude('');
        setDescription('');
        setSeverity('medium');
        setImage(null);
        setImagePreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (onLocationClear) {
          onLocationClear();
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-form-container">
      <h2 className="form-title">
        {reportType === 'aggressive' ? '⚠️ Report Aggressive Goose' : '💩 Report Geese Poop'}
      </h2>
      
      <form onSubmit={handleSubmit} className="report-form">
        <div className="form-group">
          <label>Location Method</label>
          <div className="location-method-toggle">
            <button
              type="button"
              className={`method-btn ${locationMethod === 'map' ? 'active' : ''}`}
              onClick={() => {
                setLocationMethod('map');
                setSelectedBuilding('');
                setBuildingSide('');
              }}
            >
              📍 Click on Map
            </button>
            <button
              type="button"
              className={`method-btn ${locationMethod === 'building' ? 'active' : ''}`}
              onClick={() => {
                setLocationMethod('building');
                if (onLocationClear) onLocationClear();
              }}
            >
              🏢 Select Building
            </button>
          </div>
          
          {locationMethod === 'map' && (
            <div className="location-instruction">
              <p>Click anywhere on the map to select the location</p>
              {isMobile() && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setError('');
                      const location = await getCurrentLocation();
                      setLatitude(location.latitude.toString());
                      setLongitude(location.longitude.toString());
                      if (onLocationClear) onLocationClear();
                    } catch (err) {
                      setError(err.message || 'Failed to get your location');
                    }
                  }}
                  className="btn-get-location"
                  style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#C9A961', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  📍 Use My Current Location
                </button>
              )}
              {selectedLocation && (
                <div className="selected-location-info">
                  <p>📍 Location selected: {latitude.substring(0, 8)}, {longitude.substring(0, 8)}</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (onLocationClear) onLocationClear();
                      setLatitude('');
                      setLongitude('');
                    }}
                    className="btn-clear-location"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {locationMethod === 'building' && (
            <div className="building-selector">
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="form-select"
              >
                <option value="">Select a building...</option>
                {UW_BUILDINGS.map(building => (
                  <option key={building.id} value={building.id}>
                    {building.name}
                  </option>
                ))}
              </select>
              
              {selectedBuilding && (
                <select
                  value={buildingSide}
                  onChange={(e) => setBuildingSide(e.target.value)}
                  className="form-select"
                  style={{ marginTop: '0.5rem' }}
                >
                  <option value="">Select side...</option>
                  {BUILDING_SIDES.map(side => (
                    <option key={side.value} value={side.value}>
                      {side.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add any additional details..."
            rows="3"
            className="form-textarea"
          />
        </div>

        <div className="form-group">
          <label>Severity</label>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            className="form-select"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-group">
          <label>Poop Proof Image (optional)</label>
          {isMobile() ? (
            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
              <button
                type="button"
                onClick={handleTakePhoto}
                className="btn-camera"
                style={{ padding: '0.5rem 1rem', backgroundColor: '#C9A961', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                📷 Take Photo
              </button>
              <button
                type="button"
                onClick={handlePickPhoto}
                className="btn-gallery"
                style={{ padding: '0.5rem 1rem', backgroundColor: '#718096', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                🖼️ Choose from Gallery
              </button>
            </div>
          ) : (
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={fileInputRef}
              className="form-file-input"
            />
          )}
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImagePreview(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="btn-remove-image"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">Report submitted successfully! 🎉</div>}

        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn-cancel"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !latitude || !longitude || (locationMethod === 'building' && (!selectedBuilding || !buildingSide))}
            className="btn-submit"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ReportForm;
