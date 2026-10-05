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
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  location: String,
  appointmentDateTime: { type: Date, required: true },
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
  quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
  invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
  media: {
    beforeVideo: { url: String, uploadedAt: Date },
    afterVideo: { url: String, uploadedAt: Date }
  },
  notes: [{
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: Date
  }],
  completionNotes: String,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

jobSchema.pre('save', async function () {
  if (!this.jobId) {
    const count = await this.constructor.countDocuments();
    this.jobId = `JOB-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports = mongoose.model('Job', jobSchema);
