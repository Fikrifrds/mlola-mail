import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.js';

// Import routes
import authRoutes from './routes/auth.js';
import emailRoutes from './routes/emails.js';
import templateRoutes from './routes/templates.js';
import analyticsRoutes from './routes/analytics.js';
import webhookRoutes from './routes/webhooks.js';
import apiKeyRoutes from './routes/apiKeys.js';
import trackingRoutes from './routes/tracking.js';
import senderAddressRoutes from './routes/senderAddresses.js';
import contactRoutes from './routes/contacts.js';
import userRoutes from './routes/users.js';
import brandRoutes from './routes/brands.js';
import groupRoutes from './routes/groups.js';
import campaignRoutes from './routes/campaigns.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_DEV = (process.env.NODE_ENV || 'development') === 'development';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
});
// Disable global rate limit in development to avoid throttling local dev traffic
if (!IS_DEV) {
  app.use('/api/', limiter);
} else {
  console.log('⚙️ Rate limiting is disabled on /api in development.');
}

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  // More forgiving in development, reasonable in production
  windowMs: IS_DEV ? (5 * 60 * 1000) : (15 * 60 * 1000), // 5 min dev, 15 min prod
  max: IS_DEV ? 50 : 10, // 50 attempts in dev, 10 in prod
  standardHeaders: true,
  legacyHeaders: false,
  // Do not count successful logins/registrations towards the rate limit
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
  },
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Email Service API is running',
    timestamp: new Date().toISOString(),
  });
});

// Tracking routes (public, no auth required)
app.use('/api/track', trackingRoutes);

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/api-keys', apiKeyRoutes);
app.use('/api/sender-addresses', senderAddressRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/users', userRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/campaigns', campaignRoutes);

// Webhook endpoint for email events (public endpoint)
app.post('/webhooks/email-events', express.json(), async (req, res) => {
  try {
    const { webhookService } = await import('./services/webhookService.js');
    await webhookService.handleSESEvent(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error('Error handling SES webhook:', err);
    res.status(500).json({ success: false, message: 'Failed to process webhook' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
  });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Email Service API running on port ${PORT}`);
  console.log(`📧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
});

export default app;