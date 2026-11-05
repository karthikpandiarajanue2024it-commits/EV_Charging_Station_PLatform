require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { initChangeStreams } = require('./services/changeStreamService');

// Routes
const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const sessionRoutes = require('./routes/sessions');
const faultRoutes = require('./routes/faults');
const analyticsRoutes = require('./routes/analytics');

// Connect to MongoDB
connectDB().then(() => {
  // Initialize Socket.io AFTER DB is connected
  startServer();
});

function startServer() {
  const app = express();
  const httpServer = http.createServer(app);

  // Socket.io setup with CORS
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Security middleware
  app.use(helmet({ contentSecurityPolicy: false }));

  // CORS
  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: 'Too many requests, please try again later.',
  });
  app.use('/api/', limiter);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging
  app.use(morgan('dev'));

  // Make io accessible in routes (for manual emits if needed)
  app.set('io', io);

  // ==================== ROUTES ====================
  app.use('/api/auth', authRoutes);
  app.use('/api/stations', stationRoutes);
  app.use('/api/sessions', sessionRoutes);
  app.use('/api/faults', faultRoutes);
  app.use('/api/analytics', analyticsRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      success: true,
      message: '⚡ EV Charging API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // Global error handler
  app.use(errorHandler);

  // ==================== SOCKET.IO ====================
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Join station-specific rooms for slot updates
    socket.on('join_station', (stationId) => {
      socket.join(`station:${stationId}`);
      console.log(`📍 Socket ${socket.id} joined station:${stationId}`);
    });

    // Leave station room
    socket.on('leave_station', (stationId) => {
      socket.leave(`station:${stationId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });

  // Initialize MongoDB Change Streams → Socket.io bridge
  try {
    initChangeStreams(io);
  } catch (err) {
    console.warn('⚠️ Change streams not available (replica set required for production):', err.message);
  }

  // Start server
  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
}
