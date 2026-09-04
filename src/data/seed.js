const { randomUUID } = require('crypto');

// Base prices reflect chess piece "value" - the King is the crown jewel.
const BASE_PRICES = {
  king: 500,
  queen: 250,
  rook: 100,
  bishop: 75,
  knight: 75,
  pawn: 25,
};

const PIECE_ORDER = ['king', 'queen', 'rook', 'rook', 'bishop', 'bishop', 'knight', 'knight',
  'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn', 'pawn'];

function buildSideLabel(side) {
  return side === 'white' ? 'White' : 'Black';
}

function buildPiecesForSide(side) {
  const counts = {};
  return PIECE_ORDER.map((type) => {
    counts[type] = (counts[type] || 0) + 1;
    const countForType = PIECE_ORDER.filter((t) => t === type).length;
    const suffix = countForType > 1 ? ` ${counts[type]}` : '';
    const id = countForType > 1 ? `${side}-${type}-${counts[type]}` : `${side}-${type}`;
    return {
      id,
      type,
      side,
      label: `${buildSideLabel(side)} ${type.charAt(0).toUpperCase() + type.slice(1)}${suffix}`,
      basePrice: BASE_PRICES[type],
      currentPrice: BASE_PRICES[type],
      ownerId: null,
      paymentStatus: 'unpaid', // unpaid | pending | paid
      lastPaymentIntentId: null,
      bidHistory: [],
    };
  });
}

function buildInitialPieces() {
  return [...buildPiecesForSide('white'), ...buildPiecesForSide('black')];
}

function buildInitialState() {
  const now = new Date().toISOString();
  return {
    game: {
      id: randomUUID(),
      name: 'King of the Board',
      status: 'active', // active | ended
      startedAt: now,
      endsAt: null,
      createdAt: now,
      updatedAt: now,
    },
    pieces: buildInitialPieces(),
    companies: [],
    activity: [], // flattened, most-recent-first log of all bids
  };
}

module.exports = { buildInitialState, BASE_PRICES };
