# 🦢 Geese Poop Spotter - University of Waterloo

A fun and interactive web application for reporting geese poop and aggressive geese sightings on the University of Waterloo campus.

## ⚠️ IMPORTANT: Install Node.js First!

**Before you can run this app, you must install Node.js.** If you see `zsh: command not found: npm`, you need to install Node.js first.

👉 **See `QUICK_START.md` for step-by-step installation instructions!**

Or visit: https://nodejs.org/ to download the LTS version for macOS.

## Features

- **💩 Geese Poop Reporting**: Report and track geese poop locations on campus
- **🗺️ Interactive Campus Map**: View all reports on an interactive map with University of Waterloo boundaries
- **🦢 Geese Habitat Map**: Toggle visibility of known geese habitats (lakes, creeks, grassy areas)
- **⚠️ Aggressive Goose Reporting**: Report aggressive geese encounters with severity levels
- **📸 Image Upload**: Upload proof images with your reports
- **📍 Location Services**: Automatic location detection or manual coordinate entry

## Tech Stack

- **Frontend**: React 18 with React-Leaflet for maps
- **Backend**: Node.js with Express
- **Storage**: In-memory storage (easily replaceable with a database)
- **Maps**: Leaflet with OpenStreetMap tiles

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Install all dependencies** (root, server, and client):
   ```bash
   npm run install-all
   ```

   Or install manually:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

2. **Start the development servers**:
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on `http://localhost:5000`
   - Frontend React app on `http://localhost:3000`

   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

3. **Open your browser** and navigate to `http://localhost:3000`

## Project Structure

```
geese-poop-spotter/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── MapView.js
│   │   │   ├── ReportForm.js
│   │   │   └── ReportList.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file
│   ├── uploads/           # Image uploads directory (created automatically)
│   └── package.json
└── package.json           # Root package.json
```

## API Endpoints

- `GET /api/reports` - Get all reports (optional query: `?type=poop` or `?type=aggressive`)
- `GET /api/reports/:id` - Get a specific report
- `POST /api/reports` - Create a new report (multipart/form-data with image)
- `GET /api/habitats` - Get geese habitat locations
- `GET /api/campus-bounds` - Get University of Waterloo campus boundaries
- `GET /api/health` - Health check endpoint

## Campus Boundaries

The app is restricted to University of Waterloo campus boundaries:
- **North**: 43.4800
- **South**: 43.4600
- **East**: -80.5300
- **West**: -80.5500

Reports outside these boundaries will be rejected.

## Features in Detail

### Geese Poop Reporting
- Click "Report Poop" to submit a new poop sighting
- Use your device's location or manually enter coordinates
- Add optional description and severity level
- Upload a proof image (max 5MB)

### Aggressive Goose Reporting
- Click "Report Aggressive Goose" for safety reports
- Same features as poop reporting with visual distinction on map

### Interactive Map
- View all reports as markers on the map
- Click markers to see report details and images
- Toggle geese habitat overlays
- Campus boundary visualization

### Geese Habitat Map
- Pre-configured habitat areas (Columbia Lake, Laurel Creek, Main Quad)
- Toggle visibility with checkbox
- Green overlay shows known geese gathering areas

## Future Enhancements

- Database integration (MongoDB, PostgreSQL, etc.)
- User authentication
- Report statistics and analytics
- Heat maps for high-traffic areas
- Mobile app version
- Push notifications for new reports
- Report verification system

## License

MIT

## Contributing

Feel free to submit issues and enhancement requests!

---

**Note**: This is a fun project for the University of Waterloo community. Use responsibly and stay safe around geese! 🦢
