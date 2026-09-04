function companyById(companies, id) {
  return companies.find((c) => c.id === id) || null;
}

function publicCompany(company) {
  if (!company) return null;
  const { id, name, logo, website, contact } = company;
  return { id, name, logo, website, contact };
}

function publicPiece(piece, companies) {
  return {
    id: piece.id,
    type: piece.type,
    side: piece.side,
    label: piece.label,
    basePrice: piece.basePrice,
    currentPrice: piece.currentPrice,
    isKing: piece.type === 'king',
    paymentStatus: piece.paymentStatus,
    owner: publicCompany(companyById(companies, piece.ownerId)),
    bidCount: piece.bidHistory.length,
  };
}

function publicPieceDetailed(piece, companies) {
  return {
    ...publicPiece(piece, companies),
    bidHistory: piece.bidHistory
      .slice()
      .reverse()
      .map((bid) => ({
        ...bid,
        company: publicCompany(companyById(companies, bid.companyId)),
      })),
  };
}

// "The King" is the flagship prize of the game. Chess has two kings (one per
// side); the game's single most prestigious piece is whichever king currently
// holds the higher price, with white as the tiebreaker.
function getTheKing(pieces) {
  const kings = pieces.filter((p) => p.type === 'king');
  return kings.reduce((best, p) => {
    if (!best) return p;
    if (p.currentPrice > best.currentPrice) return p;
    if (p.currentPrice === best.currentPrice && p.side === 'white') return p;
    return best;
  }, null);
}

module.exports = { companyById, publicCompany, publicPiece, publicPieceDetailed, getTheKing };
