const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Job = require('../models/Job');
const Quote = require('../models/Quote');
const Invoice = require('../models/Invoice');
const Communication = require('../models/Communication');
const Note = require('../models/Note');
const { sanitizePhoneNumber, sanitizeInput, escapeRegex } = require('../utils/sanitizer');
const logger = require('../utils/logger');

exports.createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, type, address } = req.body;

    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (!firstName || !lastName || !cleanPhone) {
      return res.status(400).json({ error: 'First name, last name, and valid phone required' });
    }

    const existingCustomer = await Customer.findOne({ phoneNumber: cleanPhone });
    if (existingCustomer) {
      return res.status(400).json({ error: 'Customer with this phone already exists' });
    }

    const customer = new Customer({
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phoneNumber: cleanPhone,
      type: type || 'vehicle',
      address: address ? sanitizeInput(address) : '',
      customerSince: new Date()
    });

    await customer.save();

    logger.info(`Customer created: ${cleanPhone} (${firstName} ${lastName})`);
    res.status(201).json(customer);
  } catch (error) {
    logger.error('Failed to create customer', { error: error.message });
    res.status(500).json({ error: 'Failed to create customer' });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const search = req.query.search;
    const sort = req.query.sort || '-createdAt';

    const query = {};
    if (search) {
      const cleanSearch = escapeRegex(search.trim());
      const regex = { $regex: cleanSearch, $options: 'i' };
      query.$or = [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }];
    }

    const [customers, total] = await Promise.all([
      Customer.find(query).skip(skip).limit(limit).sort(sort),
      Customer.countDocuments(query)
    ]);

    res.json({
      data: customers,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    logger.error('Failed to get customers', { error: error.message });
    res.status(500).json({ error: 'Failed to get customers' });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer' });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    if (updates.phoneNumber) {
      updates.phoneNumber = sanitizePhoneNumber(updates.phoneNumber);
    }
    if (updates.firstName) updates.firstName = sanitizeInput(updates.firstName);
    if (updates.lastName) updates.lastName = sanitizeInput(updates.lastName);

    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update customer' });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    customer.deletedAt = new Date();
    await customer.save();
    res.json({ message: 'Customer record marked as deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
};

exports.searchByPhone = async (req, res) => {
  try {
    const phone = sanitizePhoneNumber(req.params.phone);
    if (!phone) {
      return res.status(400).json({ error: 'Valid phone query required' });
    }

    const customer = await Customer.findOne({ phoneNumber: phone });
    res.json(customer ? [customer] : []);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.searchByName = async (req, res) => {
  try {
    const lastName = sanitizeInput(req.params.lastName);
    if (!lastName || lastName.length < 2) {
      return res.status(400).json({ error: 'Name query must be at least 2 characters' });
    }

    const escaped = escapeRegex(lastName);
    const customers = await Customer.find({
      lastName: { $regex: escaped, $options: 'i' }
    }).limit(20);

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getCustomerHistory = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [vehicles, jobs, quotes, invoices, communications, notes] = await Promise.all([
      Vehicle.find({ customerId }),
      Job.find({ customerId }).populate('vehicleId').sort({ appointmentDateTime: -1 }),
      Quote.find({ customerId }).sort({ quoteDate: -1 }),
      Invoice.find({ customerId }).sort({ invoiceDate: -1 }),
      Communication.find({ customerId }).sort({ createdAt: -1 }),
      Note.find({ customerId }).sort({ createdAt: -1 })
    ]);

    res.json({
      customer,
      vehicles,
      jobs,
      quotes,
      invoices,
      communications,
      notes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer history' });
  }
};
