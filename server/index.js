import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeDatabase, testConnection } from './db.js';
import authRoutes from './routes/auth.js';
import tripRoutes from './routes/trips.js';
import photoRoutes from './routes/photos.js';
import placeRoutes from './routes/places.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Uploaded photos
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/photos', photoRoutes);
app.use('/api/places', placeRoutes);

// In production the server also serves the built client (single Render service)
const clientDist = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../client/dist'
);
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));
}

// 404 handler — with an SPA fallback for client routes in production
app.use((req, res) => {
  const isApiPath = req.path.startsWith('/api') || req.path.startsWith('/uploads');
  if (process.env.NODE_ENV === 'production' && req.method === 'GET' && !isApiPath) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }
  console.log(`[404] Route not found: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error Handler] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database and start server
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Atlasly Server...\n');

    // Test database connection
    await testConnection();

    // Initialize database schema
    await initializeDatabase();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n✅ Server running on port ${PORT}`);
      console.log(`   Health check: http://localhost:${PORT}/health`);
      console.log(`   API endpoint: http://localhost:${PORT}/api`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('\n❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
