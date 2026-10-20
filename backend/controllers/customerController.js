const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Job = require('../models/Job');
const Invoice = require('../models/Invoice');
const Communication = require('../models/Communication');
const Note = require('../models/Note');
const { sanitizePhoneNumber, sanitizeInput, escapeRegex } = require('../utils/sanitizer');
const logger = require('../utils/logger');

exports.createCustomer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, type, address, customerSince } = req.body;

    const cleanPhone = sanitizePhoneNumber(phoneNumber);
    if (!firstName || !lastName || !cleanPhone) {
      return res.status(400).json({ error: 'First name, last name, and valid phone required' });
    }

    let since = new Date();
    if (customerSince) {
      const parsed = new Date(customerSince);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid date of joining' });
      }
      since = parsed;
    }

    const existingCustomer = await Customer.findOne({ phoneNumber: cleanPhone });
    if (existingCustomer && !existingCustomer.deletedAt) {
      return res.status(400).json({ error: 'Customer with this phone already exists' });
    }

    // Same phone on a deleted record: revive it with the new details
    if (existingCustomer && existingCustomer.deletedAt) {
      existingCustomer.firstName = sanitizeInput(firstName);
      existingCustomer.lastName = sanitizeInput(lastName);
      existingCustomer.type = type || existingCustomer.type;
      existingCustomer.address = address ? sanitizeInput(address) : existingCustomer.address;
      existingCustomer.customerSince = since;
      existingCustomer.deletedAt = null;
      existingCustomer.updatedAt = new Date();
      await existingCustomer.save();
      logger.info(`Customer revived: ${cleanPhone}`);
      return res.status(201).json(existingCustomer);
    }

    const customer = new Customer({
      firstName: sanitizeInput(firstName),
      lastName: sanitizeInput(lastName),
      phoneNumber: cleanPhone,
      type: type || 'vehicle',
      address: address ? sanitizeInput(address) : '',
      customerSince: since
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

    const query = { deletedAt: null };
    if (search) {
      const cleanSearch = escapeRegex(search.trim());
      const regex = { $regex: cleanSearch, $options: 'i' };
      query.$or = [{ firstName: regex }, { lastName: regex }, { phoneNumber: regex }];
    }

    // Assign auto IDs to customers created before the feature existed
    if (page === 1 && !search) {
      try {
        const legacy = await Customer.find({ customerId: null }).limit(50);
        for (const doc of legacy) {
          await doc.save();
        }
      } catch (backfillError) {
        logger.warn('Customer ID backfill skipped', { error: backfillError.message });
      }
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
    const customer = await Customer.findOne({ _id: req.params.id, deletedAt: null });
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
    if (updates.customerSince !== undefined && updates.customerSince !== '') {
      const parsed = new Date(updates.customerSince);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ error: 'Invalid date of joining' });
      }
      updates.customerSince = parsed;
    } else if (updates.customerSince === '') {
      delete updates.customerSince;
    }
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

// Strips the common phone separators out of a stored number so a
// contiguous query (e.g. "5550199") matches a stored value like "555-0199".
const stripPhoneSeparators = {
  $replaceAll: {
    input: {
      $replaceAll: {
        input: {
          $replaceAll: {
            input: { $replaceAll: { input: { $ifNull: ['$phoneNumber', ''] }, find: ' ', replacement: '' } },
            find: '-',
            replacement: ''
          }
        },
        find: '(',
        replacement: ''
      }
    },
    find: ')',
    replacement: ''
  }
};

exports.searchByPhone = async (req, res) => {
  try {
    // Keep digits only so partial queries match regardless of how the number
    // was entered (spaces, dashes, brackets, country code all stripped)
    const digits = String(req.params.phone || '').replace(/\D/g, '');
    if (!digits) {
      return res.status(400).json({ error: 'Valid phone query required' });
    }

    const escaped = escapeRegex(digits);

    const customers = await Customer.find({
      deletedAt: null,
      $or: [
        // Partial match on the raw stored value: "555" -> "555-0199"
        { phoneNumber: { $regex: escaped, $options: 'i' } },
        // Partial match on the de-separated stored value: "5550199" -> "555-0199"
        { $expr: { $regexMatch: { input: stripPhoneSeparators, regex: escaped, options: 'i' } } }
      ]
    }).limit(20);

    res.json(customers);
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
      lastName: { $regex: escaped, $options: 'i' },
      deletedAt: null
    }).limit(20);

    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

exports.getCustomerHistory = async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await Customer.findOne({ _id: customerId, deletedAt: null });
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const [vehicles, jobs, invoices, communications, notes] = await Promise.all([
      Vehicle.find({ customerId }),
      Job.find({ customerId }).populate('vehicleId').sort({ appointmentDateTime: -1 }),
      Invoice.find({ customerId }).sort({ invoiceDate: -1 }),
      Communication.find({ customerId }).sort({ createdAt: -1 }),
      Note.find({ customerId }).sort({ createdAt: -1 })
    ]);

    res.json({
      customer,
      vehicles,
      jobs,
      invoices,
      communications,
      notes
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get customer history' });
  }
};
