const express = require('express');
const router = express.Router();
const { getSales, createSale, getTodaySales, deleteSale } = require('../controllers/salesController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getSales);
router.post('/', createSale);
router.get('/today', getTodaySales);
router.delete('/:id', deleteSale);

module.exports = router;
