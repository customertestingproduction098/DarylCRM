const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createCommunication,
  getCommunications,
  getCustomerCommunications
} = require('../controllers/communicationController');

router.use(authMiddleware);

router.post('/', createCommunication);
router.get('/', getCommunications);
router.get('/customer/:customerId', getCustomerCommunications);

module.exports = router;
