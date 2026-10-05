const Communication = require('../models/Communication');
const Customer = require('../models/Customer');
const { fail } = require('../utils/errorHandler');

exports.createCommunication = async (req, res) => {
  try {
    const { customerId, jobId, communicationType, direction, message, subject } = req.body;

    if (!customerId || !communicationType || !direction || !message) {
      return res.status(400).json({
        error: 'Customer, communication type, direction, and message required'
      });
    }

    const communication = new Communication({
      customerId,
      jobId,
      communicationType,
      direction,
      message,
      subject,
      initiatedBy: req.user.id
    });

    await communication.save();

    await Customer.findByIdAndUpdate(customerId, { lastContactDate: new Date() });

    res.status(201).json(communication);
  } catch (error) {
    fail(res, error, 'Failed to create communication');
  }
};

exports.getCommunications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { type, search, customerId } = req.query;

    const query = {};
    if (type && type !== 'all') query.communicationType = type;
    if (customerId) query.customerId = customerId;
    if (search) {
      const matching = await Customer.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.$or = [
        { customerId: { $in: matching.map((c) => c._id) } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }

    const communications = await Communication.find(query)
      .populate('customerId initiatedBy')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Communication.countDocuments(query);

    res.json({
      data: communications,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    fail(res, error, 'Failed to get communications');
  }
};

exports.getCustomerCommunications = async (req, res) => {
  try {
    const communications = await Communication.find({ customerId: req.params.customerId })
      .populate('initiatedBy')
      .sort({ createdAt: -1 });
    res.json(communications);
  } catch (error) {
    fail(res, error, 'Failed to get communications');
  }
};
