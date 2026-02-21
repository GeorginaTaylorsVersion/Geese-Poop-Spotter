import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapView.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Helper function to create SVG data URL
const createIconUrl = (svgString) => {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
};

// Custom icons - Gold glittery poop emoji
const poopIcon = L.divIcon({
  html: '<div style="font-size: 32px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5)); text-shadow: 0 0 8px rgba(201, 169, 97, 0.8);">💩</div>',
  className: 'custom-poop-icon',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

const aggressiveIcon = new L.Icon({
  iconUrl: createIconUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="#000000" stroke="#C9A961" stroke-width="3"/>
      <path d="M20 12 L20 22 M20 24 L20 28" stroke="#C9A961" stroke-width="3" stroke-linecap="round"/>
      <circle cx="20" cy="26" r="2" fill="#C9A961"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40]
});

// Component to fit map bounds to campus
function CampusBounds({ bounds }) {
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds([
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
      ], { padding: [50, 50], maxZoom: 16 });
    }
  }, [bounds, map]);
  
  return null;
}

// Component to handle map clicks
function MapClickHandler({ onMapClick, enabled }) {
  useMapEvents({
    click: (e) => {
      if (enabled && onMapClick) {
        const { lat, lng } = e.latlng;
        onMapClick({ latitude: lat, longitude: lng });
      }
    },
  });
  return null;
}

function MapView({ reports, habitats, campusBounds, onReportClick, onMapClick, selectedLocation }) {
  const [showHabitats, setShowHabitats] = useState(true);
  
  // University of Waterloo center coordinates
  const uwCenter = [43.4700, -80.5400];

  // Temporary marker icon for selected location
  const tempMarkerIcon = L.divIcon({
    html: '<div style="font-size: 24px; filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.5));">📍</div>',
    className: 'temp-marker-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 30],
  });

  return (
    <div className={`map-view ${onMapClick ? 'clickable' : ''}`}>
      <div className="map-controls">
        {onMapClick && (
          <div className="map-click-instruction">
            <strong>📍 Click on the map to select location</strong>
          </div>
        )}
        <label className="toggle-habitats">
          <input
            type="checkbox"
            checked={showHabitats}
            onChange={(e) => setShowHabitats(e.target.checked)}
          />
          Show Geese Habitats
        </label>
      </div>
      
      <MapContainer
        center={uwCenter}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {campusBounds && <CampusBounds bounds={campusBounds} />}
        <MapClickHandler onMapClick={onMapClick} enabled={!!onMapClick} />
        
        {/* Temporary marker for selected location */}
        {selectedLocation && (
          <Marker
            position={[selectedLocation.latitude, selectedLocation.longitude]}
            icon={tempMarkerIcon}
          >
            <Popup>
              <div>Selected Location</div>
            </Popup>
          </Marker>
        )}
        
        {/* Geese habitats */}
        {showHabitats && habitats.map((habitat) => (
          <Polygon
            key={habitat.id}
            positions={habitat.coordinates}
            color="#C9A961"
            fillColor="#C9A961"
            fillOpacity={0.25}
            weight={2}
          >
            <Popup>
              <div>
                <strong>{habitat.name}</strong>
                <br />
                <small>Geese Habitat ({habitat.type})</small>
              </div>
            </Popup>
          </Polygon>
        ))}
        
        {/* Report markers */}
        {reports.map((report) => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={report.type === 'aggressive' ? aggressiveIcon : poopIcon}
          >
            <Popup>
              <div className="custom-popup">
                <h3>{report.type === 'aggressive' ? '⚠️ Aggressive Goose' : '💩 Poop Report'}</h3>
                <p><strong>By:</strong> {report.authorName || 'Goose Watcher'}</p>
                {report.description && <p>{report.description}</p>}
                <p><strong>Severity:</strong> {report.severity}</p>
                <p>
                  <strong>Social:</strong>{' '}
                  👍 {report.reactions ? report.reactions.like : 0} · ⬆️{' '}
                  {report.reactions ? report.reactions.upvote : 0} · 💬 {report.commentCount || 0}
                </p>
                <p><small>{new Date(report.timestamp).toLocaleString()}</small></p>
                {report.imageUrl && (
                  <img
                    src={report.imageUrl}
                    alt="Proof"
                    style={{ maxWidth: '200px', maxHeight: '200px', marginTop: '0.5rem', borderRadius: '8px' }}
                  />
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default MapView;
