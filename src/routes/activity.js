const express = require('express');
const { getActivity } = require('../controllers/activityController');

const router = express.Router();

router.get('/', getActivity);

module.exports = router;
