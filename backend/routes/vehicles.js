const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createVehicle,
  getVehiclesByCustomer,
  getVehicleById,
  updateVehicle,
  deleteVehicle
} = require('../controllers/vehicleController');

router.use(authMiddleware);

router.post('/', createVehicle);
router.get('/customer/:customerId', getVehiclesByCustomer);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;
