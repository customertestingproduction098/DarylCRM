const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerSchema = new Schema({
  type: {
    type: String,
    enum: ['vehicle', 'residential'],
    required: true
  },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  address: String,
  customerSince: { type: Date, default: Date.now },
  lastContactDate: { type: Date },
  deletedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', customerSchema);
