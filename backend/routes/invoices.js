const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { validateInvoice, validatePayment } = require('../middleware/validation');
const { roleMiddleware } = require('../middleware/authorization');
const { sensitiveOperationLimiter } = require('../middleware/rateLimiter');
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  deleteInvoice,
  getCustomerInvoices,
  uploadInvoiceCopy
} = require('../controllers/invoiceController');
const { uploadDocument } = require('../middleware/upload');

router.use(authMiddleware);

router.post('/', sensitiveOperationLimiter, validateInvoice, createInvoice);
router.get('/', getInvoices);
router.get('/customer/:customerId', getCustomerInvoices);
router.get('/:id', getInvoiceById);
router.put('/:id', updateInvoice);
router.patch('/:id/payment', validatePayment, recordPayment);
router.post('/:id/copy', uploadDocument.single('file'), uploadInvoiceCopy);
router.delete('/:id', roleMiddleware(['admin']), deleteInvoice);

module.exports = router;
