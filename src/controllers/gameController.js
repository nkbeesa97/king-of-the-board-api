const { readDB } = require('../db');
const { publicPiece, getTheKing, companyById, publicCompany } = require('../utils/serializers');
const { asyncHandler } = require('../utils/ApiError');

const getCurrentGame = asyncHandler(async (req, res) => {
  const db = readDB();
  const { game, pieces, companies } = db;

  const totalRaised = pieces.reduce((sum, p) => sum + (p.ownerId ? p.currentPrice : 0), 0);
  const piecesSold = pieces.filter((p) => p.ownerId).length;
  const theKing = getTheKing(pieces);

  res.json({
    game: {
      ...game,
      stats: {
        totalPieces: pieces.length,
        piecesSold,
        piecesRemaining: pieces.length - piecesSold,
        totalRaised,
        totalBids: db.activity.length,
        companiesParticipating: companies.length,
      },
      theKing: theKing
        ? {
            piece: publicPiece(theKing, companies),
            owner: publicCompany(companyById(companies, theKing.ownerId)),
          }
        : null,
    },
  });
});

module.exports = { getCurrentGame };
