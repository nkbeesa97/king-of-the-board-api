const { readDB } = require('../db');
const { asyncHandler } = require('../utils/ApiError');

const getActivity = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 500);
  const { pieceId, companyId } = req.query;
  const db = readDB();

  let activity = db.activity; // already stored newest-first
  if (pieceId) activity = activity.filter((a) => a.pieceId === pieceId);
  if (companyId) activity = activity.filter((a) => a.companyId === companyId);

  res.json({
    count: Math.min(activity.length, limit),
    total: activity.length,
    activity: activity.slice(0, limit),
  });
});

module.exports = { getActivity };
