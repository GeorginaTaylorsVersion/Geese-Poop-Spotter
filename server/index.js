const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// In-memory data storage (in production, use a database)
let reports = [];
let habitats = [
  {
    id: '1',
    name: 'Columbia Lake',
    coordinates: [[43.4685, -80.5400], [43.4695, -80.5390]],
    type: 'water'
  },
  {
    id: '2',
    name: 'Laurel Creek',
    coordinates: [[43.4700, -80.5450], [43.4710, -80.5440]],
    type: 'water'
  },
  {
    id: '3',
    name: 'Main Quad',
    coordinates: [[43.4720, -80.5430], [43.4730, -80.5420]],
    type: 'grass'
  }
];

// University of Waterloo campus boundaries (approximate)
const CAMPUS_BOUNDS = {
  north: 43.4800,
  south: 43.4600,
  east: -80.5300,
  west: -80.5500
};

// Helper function to check if coordinates are within campus bounds
function isWithinCampus(lat, lng) {
  return lat >= CAMPUS_BOUNDS.south && 
         lat <= CAMPUS_BOUNDS.north && 
         lng >= CAMPUS_BOUNDS.west && 
         lng <= CAMPUS_BOUNDS.east;
}

// Routes

// Get all reports
app.get('/api/reports', (req, res) => {
  const { type } = req.query;
  let filteredReports = reports;
  
  if (type) {
    filteredReports = reports.filter(r => r.type === type);
  }
  
  res.json(filteredReports);
});

// Get a specific report
app.get('/api/reports/:id', (req, res) => {
  const report = reports.find(r => r.id === req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found' });
  }
  res.json(report);
});

// Create a new report
app.post('/api/reports', upload.single('image'), (req, res) => {
  const { type, latitude, longitude, description, severity } = req.body;
  
  // Validate coordinates are within campus
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (!isWithinCampus(lat, lng)) {
    return res.status(400).json({ 
      error: 'Location must be within University of Waterloo campus boundaries' 
    });
  }
  
  if (!type || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const report = {
    id: uuidv4(),
    type, // 'poop' or 'aggressive'
    latitude: lat,
    longitude: lng,
    description: description || '',
    severity: severity || 'medium',
    imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
    timestamp: new Date().toISOString()
  };
  
  reports.push(report);
  res.status(201).json(report);
});

// Get geese habitats
app.get('/api/habitats', (req, res) => {
  res.json(habitats);
});

// Get campus bounds
app.get('/api/campus-bounds', (req, res) => {
  res.json(CAMPUS_BOUNDS);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
