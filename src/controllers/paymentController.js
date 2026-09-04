const { readDB, writeDB, withLock } = require('../db');
const { ApiError, asyncHandler } = require('../utils/ApiError');
const { isPositiveNumber, requireFields } = require('../utils/validate');
const { publicPieceDetailed } = require('../utils/serializers');

let stripeClient = null;
function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new ApiError(501, 'Stripe is not configured - set STRIPE_SECRET_KEY to enable payments');
  }
  if (!stripeClient) {
    // eslint-disable-next-line global-require
    const Stripe = require('stripe');
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
}

// Creates a Stripe PaymentIntent for the winning bid on a piece. The client
// confirms the PaymentIntent with Stripe.js/Stripe Elements using the
// returned clientSecret; the /api/webhooks/stripe endpoint is the source of
// truth for actually marking the piece as paid (never trust a client-only
// "success" callback in production).
const createPayment = asyncHandler(async (req, res) => {
  requireFields(req.body, ['pieceId', 'companyId', 'amount']);
  const { pieceId, companyId, amount, currency = 'usd' } = req.body;

  if (!isPositiveNumber(amount)) {
    throw new ApiError(400, 'amount must be a positive number');
  }

  const db = readDB();
  const piece = db.pieces.find((p) => p.id === pieceId);
  if (!piece) throw new ApiError(404, `Piece '${pieceId}' not found`);

  if (piece.ownerId !== companyId) {
    throw new ApiError(409, 'This company does not hold the current winning bid on this piece');
  }
  if (piece.paymentStatus === 'paid') {
    throw new ApiError(409, 'This piece has already been paid for');
  }
  if (amount !== piece.currentPrice) {
    throw new ApiError(400, `Payment amount must match the winning bid of $${piece.currentPrice}`);
  }

  const company = db.companies.find((c) => c.id === companyId);
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe uses the smallest currency unit (cents)
    currency,
    metadata: {
      gameId: db.game.id,
      pieceId: piece.id,
      pieceLabel: piece.label,
      companyId,
      companyName: company ? company.name : 'unknown',
    },
    automatic_payment_methods: { enabled: true },
  });

  await withLock(async () => {
    const fresh = readDB();
    const freshPiece = fresh.pieces.find((p) => p.id === pieceId);
    freshPiece.paymentStatus = 'pending';
    freshPiece.lastPaymentIntentId = paymentIntent.id;
    writeDB(fresh);
  });

  res.status(201).json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amount,
    currency,
  });
});

// Stripe webhook - verifies the signature and finalizes payment status.
// Must be mounted with express.raw() so the raw body is available for
// signature verification (see src/routes/payment.js).
const stripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  const signature = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(req.body, signature, webhookSecret)
      : JSON.parse(req.body.toString());
  } catch (err) {
    throw new ApiError(400, `Webhook signature verification failed: ${err.message}`);
  }

  const intent = event.data && event.data.object;
  const pieceId = intent && intent.metadata && intent.metadata.pieceId;

  if (pieceId && (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed')) {
    await withLock(async () => {
      const db = readDB();
      const piece = db.pieces.find((p) => p.id === pieceId);
      if (piece && piece.lastPaymentIntentId === intent.id) {
        piece.paymentStatus = event.type === 'payment_intent.succeeded' ? 'paid' : 'unpaid';
        if (piece.paymentStatus === 'paid') piece.paidAt = new Date().toISOString();
        writeDB(db);
      }
    });
  }

  res.json({ received: true });
});

const getPaymentStatus = asyncHandler(async (req, res) => {
  const db = readDB();
  const piece = db.pieces.find((p) => p.id === req.params.pieceId);
  if (!piece) throw new ApiError(404, `Piece '${req.params.pieceId}' not found`);
  res.json({ piece: publicPieceDetailed(piece, db.companies) });
});

module.exports = { createPayment, stripeWebhook, getPaymentStatus };
