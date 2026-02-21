const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const {
  createReportStore,
  REPORT_RETENTION_DAYS,
  LEADERBOARD_WINDOW_DAYS,
  VALID_REACTION_TYPES
} = require('./reportStore');

const app = express();
const PORT = process.env.PORT || 5000;
const uploadsDir = path.join(__dirname, 'uploads');
const reportStore = createReportStore();
let cleanupInterval;
const MAX_USER_ID_LENGTH = 128;
const MAX_DISPLAY_NAME_LENGTH = 40;
const MAX_BIO_LENGTH = 160;
const MAX_COMMENT_LENGTH = 500;

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
    
    // In production, allow Vercel URLs and localhost
    if (process.env.NODE_ENV === 'production') {
      if (origin.includes('vercel.app') || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // In development, allow everything
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(bodyParser.json());
app.use('/uploads', express.static(uploadsDir));

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
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

const habitats = [
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

// University of Waterloo campus boundaries (ring road area)
const CAMPUS_BOUNDS = {
  north: 43.47621,
  south: 43.46313,
  east: -80.5320,
  west: -80.5570
};

// Helper function to check if coordinates are within campus bounds
function isWithinCampus(lat, lng) {
  const minLng = Math.min(CAMPUS_BOUNDS.west, CAMPUS_BOUNDS.east);
  const maxLng = Math.max(CAMPUS_BOUNDS.west, CAMPUS_BOUNDS.east);
  return lat >= CAMPUS_BOUNDS.south && 
         lat <= CAMPUS_BOUNDS.north && 
         lng >= minLng && 
         lng <= maxLng;
}

function getImageUrl(fileName) {
  return fileName ? `/uploads/${fileName}` : null;
}

function sanitizeText(value, maxLength) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().slice(0, maxLength);
}

function sanitizeUserId(value) {
  return sanitizeText(value, MAX_USER_ID_LENGTH);
}

function getDefaultDisplayName(userId) {
  if (!userId) {
    return 'Goose Watcher';
  }
  return `Goose Watcher ${userId.slice(-4).toUpperCase()}`;
}

// Routes

// Get all reports
app.get('/api/reports', async (req, res) => {
  try {
    const { type, viewerId } = req.query;
    const filteredReports = await reportStore.getReports(type, {
      viewerId: sanitizeUserId(viewerId)
    });
    res.json(filteredReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get a specific report
app.get('/api/reports/:id', async (req, res) => {
  try {
    const report = await reportStore.getReportById(req.params.id, {
      viewerId: sanitizeUserId(req.query.viewerId)
    });
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create a new report
app.post('/api/reports', upload.single('image'), async (req, res) => {
  try {
    const {
      type,
      latitude,
      longitude,
      description,
      severity,
      userId: rawUserId,
      userName: rawUserName
    } = req.body;

    const userId = sanitizeUserId(rawUserId);
    const userName = sanitizeText(rawUserName, MAX_DISPLAY_NAME_LENGTH);
    const authorName = userName || getDefaultDisplayName(userId);
    
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
      imageUrl: getImageUrl(req.file ? req.file.filename : null),
      authorId: userId,
      authorName,
      timestamp: new Date().toISOString()
    };

    if (userId) {
      const existingProfile = await reportStore.getProfileById(userId);
      if (!existingProfile) {
        await reportStore.upsertProfile({
          id: userId,
          displayName: authorName
        });
      }
    }
    
    const savedReport = await reportStore.createReport(report);
    res.status(201).json(savedReport);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a profile
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const userId = sanitizeUserId(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const profile = await reportStore.getProfileById(userId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create or update a profile
app.put('/api/profiles/:id', async (req, res) => {
  try {
    const userId = sanitizeUserId(req.params.id);
    const displayName = sanitizeText(req.body.displayName, MAX_DISPLAY_NAME_LENGTH);
    const bio = sanitizeText(req.body.bio, MAX_BIO_LENGTH);
    const avatarEmoji = sanitizeText(req.body.avatarEmoji, 8);

    if (!userId) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const savedProfile = await reportStore.upsertProfile({
      id: userId,
      displayName: displayName || getDefaultDisplayName(userId),
      bio,
      avatarEmoji
    });

    if (!savedProfile) {
      return res.status(400).json({ error: 'Unable to save profile' });
    }

    res.json(savedProfile);
  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({ error: 'Failed to save profile' });
  }
});

// Add a comment to a report
app.post('/api/reports/:id/comments', async (req, res) => {
  try {
    const userId = sanitizeUserId(req.body.userId);
    const userName = sanitizeText(req.body.userName, MAX_DISPLAY_NAME_LENGTH);
    const text = sanitizeText(req.body.text, MAX_COMMENT_LENGTH);

    if (!userId || !text) {
      return res.status(400).json({ error: 'User and comment text are required' });
    }

    const updatedReport = await reportStore.addComment(req.params.id, {
      userId,
      userName,
      text
    });

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found or comment invalid' });
    }

    res.status(201).json(updatedReport);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Toggle reaction on a report
app.post('/api/reports/:id/reactions', async (req, res) => {
  try {
    const userId = sanitizeUserId(req.body.userId);
    const reactionType = sanitizeText(req.body.reactionType, 16).toLowerCase();

    if (!userId || !VALID_REACTION_TYPES.includes(reactionType)) {
      return res.status(400).json({ error: 'Invalid user or reaction type' });
    }

    const updatedReport = await reportStore.toggleReaction(req.params.id, userId, reactionType);

    if (!updatedReport) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(updatedReport);
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// Weekly leaderboard
app.get('/api/leaderboard/weekly', async (req, res) => {
  try {
    const rawLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 25)) : 10;
    const leaderboard = await reportStore.getWeeklyLeaderboard(limit);

    res.json({
      windowDays: LEADERBOARD_WINDOW_DAYS,
      generatedAt: new Date().toISOString(),
      leaderboard
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

async function startServer() {
  await reportStore.init();

  cleanupInterval = setInterval(async () => {
    try {
      const removedCount = await reportStore.cleanupOldReports();
      if (removedCount > 0) {
        console.log(`Cleaned up ${removedCount} old report(s)`);
      }
    } catch (error) {
      console.error('Error cleaning up reports:', error);
    }
  }, 60 * 60 * 1000);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Report storage mode: ${reportStore.mode}`);
    console.log(`Report retention: ${REPORT_RETENTION_DAYS} day(s)`);
  });
}

async function shutdown(signal) {
  console.log(`Received ${signal}. Shutting down gracefully...`);

  if (cleanupInterval) {
    clearInterval(cleanupInterval);
  }

  try {
    await reportStore.close();
  } catch (error) {
    console.error('Error while closing report store:', error);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
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

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
