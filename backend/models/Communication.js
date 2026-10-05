const mongoose = require('mongoose');
const { Schema } = mongoose;

const communicationSchema = new Schema({
  customerId: {
    type: Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  jobId: { type: Schema.Types.ObjectId, ref: 'Job' },
  communicationType: {
    type: String,
    enum: ['call', 'sms', 'email', 'in_person', 'note'],
    required: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    required: true
  },
  subject: String,
  message: { type: String, required: true },
  initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Communication', communicationSchema);
