import React, { useState, useEffect, useCallback } from 'react';
import MapView from './components/MapView';
import ReportForm from './components/ReportForm';
import ReportList from './components/ReportList';
import ProfileCard from './components/ProfileCard';
import Leaderboard from './components/Leaderboard';
import { createDefaultProfile, getOrCreateUserId } from './utils/profile';
import './App.css';

// Use relative URL in production (same server), absolute URL in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api');

function App() {
  const [currentUserId] = useState(() => getOrCreateUserId());
  const [reports, setReports] = useState([]);
  const [habitats, setHabitats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('poop');
  const [filterType, setFilterType] = useState('all');
  const [campusBounds, setCampusBounds] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [reportsError, setReportsError] = useState('');
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardError, setLeaderboardError] = useState('');
  const [leaderboardWindowDays, setLeaderboardWindowDays] = useState(7);

  const fetchReports = useCallback(async (silent = false) => {
    try {
      const params = new URLSearchParams();
      if (filterType !== 'all') {
        params.set('type', filterType);
      }
      params.set('viewerId', currentUserId);
      const url = `${API_BASE_URL}/reports?${params.toString()}`;
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
  }, [filterType, currentUserId]);

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

  const fetchOrCreateProfile = useCallback(async () => {
    const defaultProfile = createDefaultProfile(currentUserId);
    setProfileError('');

    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${currentUserId}`);
      if (response.ok) {
        const existingProfile = await response.json();
        setProfile(existingProfile);
        return;
      }

      if (response.status !== 404) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const createdResponse = await fetch(`${API_BASE_URL}/profiles/${currentUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultProfile)
      });

      if (!createdResponse.ok) {
        throw new Error(`Failed with status ${createdResponse.status}`);
      }

      const createdProfile = await createdResponse.json();
      setProfile(createdProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
      setProfile(defaultProfile);
      setProfileError('Using local profile for now. Changes may not sync.');
    }
  }, [currentUserId]);

  const fetchLeaderboard = useCallback(async (silent = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/leaderboard/weekly?limit=10`);
      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const data = await response.json();
      setLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : []);
      setLeaderboardWindowDays(data.windowDays || 7);
      setLeaderboardError('');
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      if (!silent) {
        setLeaderboardError('Unable to load ranking right now.');
      }
    }
  }, []);

  const saveProfile = useCallback(async (nextProfile) => {
    setProfileError('');
    setIsSavingProfile(true);

    try {
      const response = await fetch(`${API_BASE_URL}/profiles/${currentUserId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextProfile)
      });

      if (!response.ok) {
        throw new Error(`Failed with status ${response.status}`);
      }

      const savedProfile = await response.json();
      setProfile(savedProfile);
      fetchLeaderboard(true);
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      setProfileError('Could not save profile. Please try again.');
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  }, [currentUserId, fetchLeaderboard]);

  useEffect(() => {
    fetchReports();
    fetchHabitats();
    fetchCampusBounds();
    fetchOrCreateProfile();
    fetchLeaderboard();
  }, [fetchReports, fetchHabitats, fetchCampusBounds, fetchOrCreateProfile, fetchLeaderboard]);

  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchReports(true);
      fetchLeaderboard(true);
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [fetchReports, fetchLeaderboard]);

  const handleReportSubmit = () => {
    fetchReports();
    fetchLeaderboard(true);
    setShowForm(false);
    setSelectedLocation(null);
  };

  const handleReportChange = useCallback((updatedReport) => {
    if (!updatedReport) {
      return;
    }
    setReports((previousReports) =>
      previousReports.map((report) => (report.id === updatedReport.id ? updatedReport : report))
    );
  }, []);

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setShowForm(true);
  };

  const currentUserProfile = profile || createDefaultProfile(currentUserId);

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
              onClick={() => {
                setSelectedReportType('poop');
                setShowForm(true);
              }}
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

          <ProfileCard
            profile={currentUserProfile}
            onSave={saveProfile}
            isSaving={isSavingProfile}
            error={profileError}
          />

          <Leaderboard
            leaderboard={leaderboard}
            currentUserId={currentUserId}
            error={leaderboardError}
            windowDays={leaderboardWindowDays}
          />

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
              currentUser={currentUserProfile}
            />
          ) : (
            <ReportList
              reports={reports}
              apiBaseUrl={API_BASE_URL}
              currentUserId={currentUserId}
              currentUserName={currentUserProfile.displayName}
              onReportChange={handleReportChange}
              onContribution={() => fetchLeaderboard(true)}
            />
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
