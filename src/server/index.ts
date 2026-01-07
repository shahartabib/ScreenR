/**
 * ScreenR API Server
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getDb } from './db/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import tutorialRoutes from './routes/tutorials.js';
import reportsRoutes from './routes/reports.js';
import publishRoutes from './routes/publish.js';
import brandingRoutes from './routes/branding.js';
import usersRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static('uploads'));
app.use('/assets', express.static('output/projects'));
app.use('/output/projects', express.static('output/projects'));
app.use('/', express.static('webapp'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tutorials', tutorialRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/publish', publishRoutes);
app.use('/api/branding', brandingRoutes);
app.use('/api/users', usersRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve player for embed/view
app.get('/embed/:tutorialId', (req, res) => {
  const playerPath = path.join(process.cwd(), 'src', 'player', 'player.html');
  if (fs.existsSync(playerPath)) {
    res.sendFile(playerPath);
  } else {
    res.status(404).send('Player not found');
  }
});

app.get('/view/:tutorialId', (req, res) => {
  const playerPath = path.join(process.cwd(), 'src', 'player', 'player.html');
  if (fs.existsSync(playerPath)) {
    res.sendFile(playerPath);
  } else {
    res.status(404).send('Player not found');
  }
});

// Initialize database
getDb();

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║                                                   ║
║   🎬 ScreenR API Server                           ║
║                                                   ║
║   API:     http://localhost:${PORT}/api            ║
║   Health:  http://localhost:${PORT}/api/health     ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
  `);
});

export default app;
