const express = require('express');
const { createPayment, getPaymentStatus } = require('../controllers/paymentController');

const router = express.Router();

router.post('/', createPayment);
router.get('/:pieceId', getPaymentStatus);

module.exports = router;
