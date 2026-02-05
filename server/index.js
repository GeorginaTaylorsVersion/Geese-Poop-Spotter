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
// Configure CORS to allow requests from your frontend
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5001',
  process.env.FRONTEND_URL // Will be set in production
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

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
         lng <= CAMPUS_BOUNDS.west && 
         lng >= CAMPUS_BOUNDS.east;
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
  try {
    const { type, latitude, longitude, description, severity } = req.body;
    
    console.log('Report submission received:', { type, latitude, longitude, description, severity });
    
    // Validate required fields first
    if (!type || !latitude || !longitude) {
      console.error('Missing required fields:', { type, latitude, longitude });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Parse and validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    console.log('Parsed coordinates:', { lat, lng });
    console.log('Campus bounds:', CAMPUS_BOUNDS);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude values' });
    }
    
    if (!isWithinCampus(lat, lng)) {
      console.error('Location outside campus bounds:', { lat, lng });
      return res.status(400).json({ 
        error: 'Location must be within University of Waterloo campus boundaries' 
      });
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
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  // Serve static files from React build, but only for non-API routes
  // API routes are already defined above, so they'll be matched first
  app.use(express.static(clientBuildPath));
  
  // Handle React routing - catch all GET requests that don't match API routes
  // API routes are defined above, so Express will match them first
  app.get('*', (req, res) => {
    // Double-check: if somehow an API route reaches here, return 404
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log('Serving React app from production build');
  }
});
