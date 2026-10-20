const mongoose = require('mongoose');
const { Schema } = mongoose;

const customerSchema = new Schema({
  customerId: { type: String, unique: true, sparse: true },
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

customerSchema.pre('save', async function () {
  if (!this.customerId) {
    const year = new Date().getFullYear();
    let n = (await this.constructor.countDocuments({ customerId: { $ne: null } })) + 1;
    let code = `CUS-${year}-${String(n).padStart(4, '0')}`;
    // Skip numbers already taken (e.g. after deletions)
    while (await this.constructor.exists({ customerId: code })) {
      n += 1;
      code = `CUS-${year}-${String(n).padStart(4, '0')}`;
    }
    this.customerId = code;
  }
});

module.exports = mongoose.model('Customer', customerSchema);
