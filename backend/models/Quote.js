const mongoose = require('mongoose');
const { Schema } = mongoose;

const quoteSchema = new Schema({
  quoteId: { type: String, unique: true, sparse: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  quoteDate: { type: Date, default: Date.now },
  validUntil: Date,
  status: {
    type: String,
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired'],
    default: 'draft'
  },
  lineItems: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    tax: Number,
    total: Number
  }],
  subtotal: Number,
  taxAmount: Number,
  totalAmount: Number,
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

quoteSchema.pre('save', async function () {
  if (!this.quoteId) {
    const count = await this.constructor.countDocuments();
    this.quoteId = `QUO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Quote', quoteSchema);
