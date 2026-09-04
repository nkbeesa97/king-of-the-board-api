require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const gameRoutes = require('./routes/game');
const piecesRoutes = require('./routes/pieces');
const leaderboardRoutes = require('./routes/leaderboard');
const activityRoutes = require('./routes/activity');
const companiesRoutes = require('./routes/companies');
const paymentRoutes = require('./routes/payment');
const webhookRoutes = require('./routes/webhooks');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS && process.env.CORS_ORIGINS !== '*'
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : true,
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Stripe webhooks need the raw body for signature verification, so this is
// mounted before the JSON body parser below.
app.use('/api/webhooks', webhookRoutes);

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'King of the Board API',
    status: 'ok',
    docs: '/api',
  });
});

app.get('/api', (req, res) => {
  res.json({
    endpoints: [
      'GET  /api/game/current',
      'GET  /api/pieces',
      'GET  /api/pieces/:id',
      'POST /api/pieces/:id/bid',
      'GET  /api/leaderboard',
      'GET  /api/leaderboard/stream',
      'GET  /api/activity',
      'GET  /api/companies',
      'GET  /api/companies/:id',
      'POST /api/payment',
      'GET  /api/payment/:pieceId',
      'POST /api/webhooks/stripe',
    ],
  });
});

app.use('/api/game', gameRoutes);
app.use('/api/pieces', piecesRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/companies', companiesRoutes);
app.use('/api/payment', paymentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
