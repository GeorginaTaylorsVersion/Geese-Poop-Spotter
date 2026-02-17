import React, { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import './App.css';

// Use relative URL in production (same server), absolute URL in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

function App() {
  const [reports, setReports] = useState([]);
  const [habitats, setHabitats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('poop');
  const [filterType, setFilterType] = useState('all');
  const [campusBounds, setCampusBounds] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportsError, setReportsError] = useState('');

  const fetchReports = useCallback(async (silent = false) => {
    try {
      const url = filterType === 'all' 
        ? `${API_BASE_URL}/reports`
        : `${API_BASE_URL}/reports?type=${filterType}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }
      const data = await response.json();
      setReports(data);
      setReportsError('');
    } catch (error) {
      console.error('Error fetching reports:', error);
      if (!silent) {
        setReportsError('Unable to load shared reports right now. Please refresh in a moment.');
      }
    }
  }, [filterType]);

  const fetchHabitats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/habitats`);
      const data = await response.json();
      setHabitats(data);
    } catch (error) {
      console.error('Error fetching habitats:', error);
    }
  }, []);

  const fetchCampusBounds = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/campus-bounds`);
      const data = await response.json();
      setCampusBounds(data);
    } catch (error) {
      console.error('Error fetching campus bounds:', error);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchHabitats();
    fetchCampusBounds();
  }, [fetchReports, fetchHabitats, fetchCampusBounds]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchReports(true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchReports]);

  const handleReportSubmit = () => {
    fetchReports();
    setShowForm(false);
    setSelectedLocation(null);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setShowForm(true);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🦢 Geese Poop Spotter</h1>
        <p className="subtitle">University of Waterloo Campus</p>
      </header>

      <div className="main-container">
        <div className="sidebar">
          <div className="controls">
            <button
              className={`btn btn-primary ${!showForm ? 'active' : ''}`}
              onClick={() => setShowForm(false)}
            >
              View Map
            </button>
            <button
              className={`btn btn-secondary ${showForm ? 'active' : ''}`}
              onClick={() => setShowForm(true)}
            >
              💩 Report Poop
            </button>
            <button
              className={`btn btn-danger ${showForm && selectedReportType === 'aggressive' ? 'active' : ''}`}
              onClick={() => {
                setSelectedReportType('aggressive');
                setShowForm(true);
              }}
            >
              Report Aggressive Goose
            </button>
          </div>

          <div className="filter-section">
            <label>Filter Reports:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Reports</option>
              <option value="poop">Poop Reports</option>
              <option value="aggressive">Aggressive Goose Reports</option>
            </select>
            <p className="sync-note">Shared reports auto-refresh every 30s and expire after 7 days.</p>
            {reportsError && <p className="sync-error">{reportsError}</p>}
          </div>

          {showForm ? (
            <ReportForm
              reportType={selectedReportType}
              onSuccess={handleReportSubmit}
              onCancel={() => {
                setShowForm(false);
                setSelectedLocation(null);
              }}
              campusBounds={campusBounds}
              selectedLocation={selectedLocation}
              onLocationClear={() => setSelectedLocation(null)}
            />
          ) : (
            <ReportList reports={reports} />
          )}
        </div>

        <div className="map-container">
          <MapView
            reports={reports}
            habitats={habitats}
            campusBounds={campusBounds}
            onReportClick={(report) => {
              setSelectedReportType(report.type);
              setShowForm(true);
            }}
            onMapClick={showForm ? handleLocationSelect : null}
            selectedLocation={selectedLocation}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
