const express = require('express');
const { getAllCompanies, getCompanyById } = require('../controllers/companiesController');

const router = express.Router();

router.get('/', getAllCompanies);
router.get('/:id', getCompanyById);

module.exports = router;
