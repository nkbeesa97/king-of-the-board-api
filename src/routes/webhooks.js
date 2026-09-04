const express = require('express');
const { stripeWebhook } = require('../controllers/paymentController');

const router = express.Router();

// Stripe requires the raw, unparsed request body to verify the webhook
// signature - this route is mounted BEFORE the global express.json()
// middleware in app.js so req.body stays a raw Buffer here.
router.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;
