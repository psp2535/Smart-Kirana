const express = require('express');
const router = express.Router();
const { getInventory, addItem, updateItem, deleteItem, getLowStock } = require('../controllers/inventoryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getInventory);
router.post('/', addItem);
router.put('/:id', updateItem);
router.delete('/:id', deleteItem);
router.get('/low-stock', getLowStock);

module.exports = router;
