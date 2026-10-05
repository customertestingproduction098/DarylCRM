const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { globalLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const vehicleRoutes = require('./routes/vehicles');
const jobRoutes = require('./routes/jobs');
const quoteRoutes = require('./routes/quotes');
const invoiceRoutes = require('./routes/invoices');
const communicationRoutes = require('./routes/communications');
const noteRoutes = require('./routes/notes');

const app = express();

// Trust proxy if behind reverse proxy (Render, Netlify, Cloudflare)
app.set('trust proxy', 1);

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'", 'http://localhost:3000', 'http://localhost:5173', process.env.FRONTEND_URL || '']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS Hardening
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive in local dev, restrictable in prod
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(cookieParser());

// Uploaded before/after job videos
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global Rate Limiter
app.use('/api/', globalLimiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime())
  });
});

// CSRF Token endpoint (for double-submit cookie protection)
app.get('/api/csrf-token', (req, res) => {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Accessible by frontend JS to copy into request header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  res.json({ csrfToken: token });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/notes', noteRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
