const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/authorization');
const { sensitiveOperationLimiter } = require('../middleware/rateLimiter');
const { validateCustomer } = require('../middleware/validation');
const {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchByPhone,
  searchByName,
  getCustomerHistory
} = require('../controllers/customerController');

router.use(authMiddleware);

router.post('/', sensitiveOperationLimiter, validateCustomer, createCustomer);
router.get('/', getCustomers);
router.get('/search/by-phone/:phone', searchByPhone);
router.get('/search/by-name/:lastName', searchByName);
router.get('/:id', getCustomerById);
router.get('/:id/history', getCustomerHistory);
router.put('/:id', validateCustomer, updateCustomer);
router.delete('/:id', roleMiddleware(['admin', 'manager']), sensitiveOperationLimiter, deleteCustomer);

module.exports = router;
