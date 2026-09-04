const { readDB } = require('../db');
const { publicCompany, publicPiece } = require('../utils/serializers');
const { ApiError, asyncHandler } = require('../utils/ApiError');

const getAllCompanies = asyncHandler(async (req, res) => {
  const db = readDB();
  const companies = db.companies.map((c) => {
    const owned = db.pieces.filter((p) => p.ownerId === c.id);
    return {
      ...publicCompany(c),
      piecesOwned: owned.length,
      totalSpent: owned.reduce((sum, p) => sum + p.currentPrice, 0),
    };
  });
  res.json({ count: companies.length, companies });
});

const getCompanyById = asyncHandler(async (req, res) => {
  const db = readDB();
  const company = db.companies.find((c) => c.id === req.params.id);
  if (!company) throw new ApiError(404, `Company '${req.params.id}' not found`);
  const owned = db.pieces.filter((p) => p.ownerId === company.id);
  res.json({
    company: publicCompany(company),
    piecesOwned: owned.map((p) => publicPiece(p, db.companies)),
    totalSpent: owned.reduce((sum, p) => sum + p.currentPrice, 0),
  });
});

module.exports = { getAllCompanies, getCompanyById };
