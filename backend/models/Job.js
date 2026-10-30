const mongoose = require('mongoose');
const { Schema } = mongoose;

const jobSchema = new Schema({
  jobId: { type: String, unique: true, sparse: true },
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  vehicleId: {
    type: Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  jobType: {
    type: String,
    enum: ['vehicle_repair', 'vehicle_replacement', 'residential_repair', 'residential_replacement'],
    required: true
  },
  jobStatus: {
    type: String,
    enum: ['quote', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  location: String,
  appointmentDateTime: { type: Date },
  specifications: {
    glassType: String,
    repairType: String,
    materialUsed: String,
    workDetails: String
  },
  poNumber: String,
  supplierName: String,
  supplierOrderedFrom: String,
  supplierOrderId: String,
  quoteAmount: { type: Number, default: null },
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  media: {
    beforeVideo: { url: String, uploadedAt: Date },
    afterVideo: { url: String, uploadedAt: Date }
  },
  notes: [{
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    attachment: {
      url: String,
      originalName: String,
      mimetype: String,
      size: Number
    },
    attachmentUrl: String,
    attachmentName: String,
    createdAt: { type: Date, default: Date.now }
  }],
  completionNotes: String,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Auto generated PO number (also used when an edit clears the field)
jobSchema.statics.nextPoNumber = async function () {
  const year = new Date().getFullYear();
  let n = (await this.countDocuments({ poNumber: { $ne: null } })) + 1;
  let po = `PO-${year}-${String(n).padStart(4, '0')}`;
  while (await this.exists({ poNumber: po })) {
    n += 1;
    po = `PO-${year}-${String(n).padStart(4, '0')}`;
  }
  return po;
};

jobSchema.pre('save', async function () {
  if (!this.jobId) {
    const count = await this.constructor.countDocuments();
    this.jobId = `JOB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  // PO number is auto generated when the form leaves it blank
  if (!this.poNumber) {
    this.poNumber = await this.constructor.nextPoNumber();
  }
});

module.exports = mongoose.model('Job', jobSchema);
