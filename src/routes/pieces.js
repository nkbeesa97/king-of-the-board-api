const express = require('express');
const rateLimit = require('express-rate-limit');
const { getAllPieces, getPieceById, placeBid } = require('../controllers/piecesController');

const router = express.Router();

const bidLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many bids from this client - please slow down' },
});

router.get('/', getAllPieces);
router.get('/:id', getPieceById);
router.post('/:id/bid', bidLimiter, placeBid);

module.exports = router;
