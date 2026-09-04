const express = require('express');
const { getLeaderboard, streamLeaderboard } = require('../controllers/leaderboardController');

const router = express.Router();

router.get('/', getLeaderboard);
router.get('/stream', streamLeaderboard);

module.exports = router;
