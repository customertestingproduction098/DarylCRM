const mongoose = require('mongoose');
const { Schema } = mongoose;

const invoiceSchema = new Schema({
  invoiceId: { type: String, unique: true, sparse: true },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  invoiceDate: { type: Date, default: Date.now },
  dueDate: Date,
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
  amountPaid: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentMethod: String,
  physicalCopyFiled: { type: Boolean, default: false },
  fileLocation: String,
  notes: String,
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

invoiceSchema.pre('save', async function () {
  if (!this.invoiceId) {
    const count = await this.constructor.countDocuments();
    this.invoiceId = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Invoice', invoiceSchema);
