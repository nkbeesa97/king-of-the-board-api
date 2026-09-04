const { readDB } = require('../db');
const { publicPiece } = require('../utils/serializers');
const { asyncHandler } = require('../utils/ApiError');

const getLeaderboard = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 32);
  const db = readDB();

  const ranked = db.pieces
    .filter((p) => p.ownerId)
    .sort((a, b) => b.currentPrice - a.currentPrice)
    .slice(0, limit)
    .map((p, index) => ({ rank: index + 1, ...publicPiece(p, db.companies) }));

  res.json({
    updatedAt: db.game.updatedAt,
    count: ranked.length,
    leaderboard: ranked,
  });
});

function buildLeaderboardPayload(limit) {
  const db = readDB();
  const ranked = db.pieces
    .filter((p) => p.ownerId)
    .sort((a, b) => b.currentPrice - a.currentPrice)
    .slice(0, limit)
    .map((p, index) => ({ rank: index + 1, ...publicPiece(p, db.companies) }));
  return { updatedAt: db.game.updatedAt, count: ranked.length, leaderboard: ranked };
}

// Server-Sent Events stream that polls the store and pushes a fresh snapshot
// whenever it changes. This gives "real-time" leaderboard updates without a
// separate pub/sub service, and works on any persistent Node host. On
// serverless (Vercel), each connection polls its own instance's copy of the
// store, so it stays correct for a single instance but won't see writes that
// land on a different concurrently-running instance - for true multi-instance
// real-time on Vercel, back this with a hosted pub/sub (Pusher/Ably) or a
// database that supports change notifications (e.g. Postgres LISTEN/NOTIFY).
const streamLeaderboard = (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 32);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  let lastSnapshot = null;
  const send = () => {
    const payload = buildLeaderboardPayload(limit);
    const snapshot = JSON.stringify(payload);
    if (snapshot !== lastSnapshot) {
      lastSnapshot = snapshot;
      res.write(`data: ${snapshot}\n\n`);
    }
  };

  send();
  const interval = setInterval(send, 2000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
};

module.exports = { getLeaderboard, streamLeaderboard };
