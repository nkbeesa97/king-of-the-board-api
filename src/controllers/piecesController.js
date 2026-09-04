const { randomUUID } = require('crypto');
const { readDB, writeDB, withLock } = require('../db');
const { ApiError, asyncHandler } = require('../utils/ApiError');
const { publicPiece, publicPieceDetailed } = require('../utils/serializers');
const { isNonEmptyString, isValidUrl, isValidEmail, isPositiveNumber } = require('../utils/validate');

const BID_INCREMENT = Number(process.env.BID_INCREMENT || 5);

const getAllPieces = asyncHandler(async (req, res) => {
  const { side, type, available } = req.query;
  const db = readDB();
  let pieces = db.pieces;

  if (side) pieces = pieces.filter((p) => p.side === side);
  if (type) pieces = pieces.filter((p) => p.type === type);
  if (available === 'true') pieces = pieces.filter((p) => !p.ownerId);
  if (available === 'false') pieces = pieces.filter((p) => p.ownerId);

  res.json({
    count: pieces.length,
    pieces: pieces.map((p) => publicPiece(p, db.companies)),
  });
});

const getPieceById = asyncHandler(async (req, res) => {
  const db = readDB();
  const piece = db.pieces.find((p) => p.id === req.params.id);
  if (!piece) throw new ApiError(404, `Piece '${req.params.id}' not found`);
  res.json({ piece: publicPieceDetailed(piece, db.companies) });
});

function validateOrCreateCompany(db, body) {
  if (isNonEmptyString(body.companyId)) {
    const existing = db.companies.find((c) => c.id === body.companyId);
    if (!existing) throw new ApiError(404, `Company '${body.companyId}' not found`);
    return existing;
  }

  const company = body.company;
  if (!company || !isNonEmptyString(company.name)) {
    throw new ApiError(400, 'Provide an existing companyId or a company object with at least a name');
  }
  if (company.website !== undefined && company.website !== '' && !isValidUrl(company.website)) {
    throw new ApiError(400, 'company.website must be a valid URL');
  }
  if (company.logo !== undefined && company.logo !== '' && !isValidUrl(company.logo)) {
    throw new ApiError(400, 'company.logo must be a valid URL');
  }
  if (company.contact !== undefined && company.contact !== '' && !isValidEmail(company.contact)) {
    throw new ApiError(400, 'company.contact must be a valid email address');
  }

  const newCompany = {
    id: randomUUID(),
    name: company.name.trim(),
    logo: company.logo || null,
    website: company.website || null,
    contact: company.contact || null,
    createdAt: new Date().toISOString(),
  };
  db.companies.push(newCompany);
  return newCompany;
}

const placeBid = asyncHandler(async (req, res) => {
  const { amount } = req.body;

  if (!isPositiveNumber(amount)) {
    throw new ApiError(400, 'amount must be a positive number');
  }

  const result = await withLock(async () => {
    const db = readDB();

    if (db.game.status !== 'active') {
      throw new ApiError(409, 'This game has ended - bidding is closed');
    }

    const piece = db.pieces.find((p) => p.id === req.params.id);
    if (!piece) throw new ApiError(404, `Piece '${req.params.id}' not found`);

    const minimumBid = piece.currentPrice + BID_INCREMENT;
    if (amount < minimumBid) {
      throw new ApiError(400, `Bid too low - minimum bid is $${minimumBid} (current price $${piece.currentPrice} + $${BID_INCREMENT} increment)`, {
        currentPrice: piece.currentPrice,
        minimumBid,
        increment: BID_INCREMENT,
      });
    }

    const company = validateOrCreateCompany(db, req.body);

    if (piece.ownerId === company.id) {
      throw new ApiError(400, 'This company already owns this piece');
    }

    const bidRecord = {
      id: randomUUID(),
      companyId: company.id,
      amount,
      previousPrice: piece.currentPrice,
      previousOwnerId: piece.ownerId,
      timestamp: new Date().toISOString(),
    };

    piece.bidHistory.push(bidRecord);
    piece.currentPrice = amount;
    piece.ownerId = company.id;
    piece.paymentStatus = 'unpaid';
    piece.lastPaymentIntentId = null;

    db.activity.unshift({
      id: bidRecord.id,
      pieceId: piece.id,
      pieceLabel: piece.label,
      isKing: piece.type === 'king',
      companyId: company.id,
      companyName: company.name,
      amount,
      timestamp: bidRecord.timestamp,
    });
    // Cap the activity log so the file doesn't grow unbounded.
    db.activity = db.activity.slice(0, 500);

    writeDB(db);

    return { piece, company, db };
  });

  res.status(201).json({
    message: `Bid placed on ${result.piece.label} for $${amount}`,
    piece: publicPieceDetailed(result.piece, result.db.companies),
  });
});

module.exports = { getAllPieces, getPieceById, placeBid, BID_INCREMENT };
