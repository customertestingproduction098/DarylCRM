const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateQuote } = require('../middleware/validation');
const { roleMiddleware } = require('../middleware/authorization');
const {
  createQuote,
  getQuotes,
  getQuoteById,
  updateQuote,
  updateQuoteStatus,
  deleteQuote
} = require('../controllers/quoteController');

router.use(authMiddleware);

router.post('/', validateQuote, createQuote);
router.get('/', getQuotes);
router.get('/:id', getQuoteById);
router.put('/:id', updateQuote);
router.patch('/:id/status', updateQuoteStatus);
router.delete('/:id', roleMiddleware(['admin', 'manager']), deleteQuote);

module.exports = router;
