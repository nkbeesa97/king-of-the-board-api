const express = require('express');
const { getCurrentGame } = require('../controllers/gameController');

const router = express.Router();

router.get('/current', getCurrentGame);

module.exports = router;
