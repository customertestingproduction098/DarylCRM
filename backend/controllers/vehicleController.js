const Vehicle = require('../models/Vehicle');
const { fail } = require('../utils/errorHandler');

exports.createVehicle = async (req, res) => {
  try {
    const { customerId, year, make } = req.body;

    if (!customerId || !year || !make) {
      return res.status(400).json({ error: 'Customer ID, year, and make required' });
    }

    const vehicle = new Vehicle(req.body);
    await vehicle.save();
    res.status(201).json(vehicle);
  } catch (error) {
    fail(res, error, 'Failed to create vehicle');
  }
};

exports.getVehiclesByCustomer = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ customerId: req.params.customerId });
    res.json(vehicles);
  } catch (error) {
    fail(res, error, 'Failed to get vehicles');
  }
};

exports.getVehicleById = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    fail(res, error, 'Failed to get vehicle');
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json(vehicle);
  } catch (error) {
    fail(res, error, 'Failed to update vehicle');
  }
};

exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted' });
  } catch (error) {
    fail(res, error, 'Failed to delete vehicle');
  }
};
