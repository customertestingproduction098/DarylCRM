const mongoose = require('mongoose');
const { Schema } = mongoose;

const settingsSchema = new Schema({
  businessName: String,
  taxRate: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);
