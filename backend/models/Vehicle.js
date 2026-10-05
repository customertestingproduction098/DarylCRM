const mongoose = require('mongoose');
const { Schema } = mongoose;

const vehicleSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  year: { type: Number, required: true },
  make: { type: String, required: true },
  model: { type: String },
  glassCode: { type: String },
  insuranceNumber: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
