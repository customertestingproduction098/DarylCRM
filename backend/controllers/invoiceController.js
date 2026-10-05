const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Settings = require('../models/Settings');
const { fail } = require('../utils/errorHandler');

// Calculate line item + document totals. Tax rate from Settings when available.
const buildTotals = async (lineItems = []) => {
  const settings = await Settings.findOne();
  const taxRate = (settings?.taxRate ?? 8) / 100;

  const items = lineItems.map((item) => {
    const quantity = item.quantity || 1;
    const unitPrice = item.unitPrice || 0;
    const lineTotal = quantity * unitPrice;
    const lineTax = lineTotal * taxRate;
    return {
      ...item,
      quantity,
      unitPrice,
      tax: lineTax,
      total: lineTotal + lineTax
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * taxRate;
  return { lineItems: items, subtotal, taxAmount, totalAmount: subtotal + taxAmount };
};

exports.createInvoice = async (req, res) => {
  try {
    const { customerId, jobId, quoteId, lineItems, notes, dueDate, paymentStatus } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const totals = await buildTotals(lineItems);

    const invoice = new Invoice({
      customerId,
      jobId,
      quoteId,
      notes,
      paymentStatus: paymentStatus || 'pending',
      ...totals,
      invoiceDate: new Date(),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: req.user.id
    });

    await invoice.save();

    await Customer.findByIdAndUpdate(customerId, { lastContactDate: new Date() });

    res.status(201).json(invoice);
  } catch (error) {
    fail(res, error, 'Failed to create invoice');
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, search, from, to, sort } = req.query;

    const query = {};
    if (status) query.paymentStatus = status;
    if (from || to) {
      query.invoiceDate = {};
      if (from) query.invoiceDate.$gte = new Date(from);
      if (to) query.invoiceDate.$lte = new Date(to);
    }
    if (search) {
      const matching = await Customer.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.customerId = { $in: matching.map((c) => c._id) };
    }

    const invoices = await Invoice.find(query)
      .populate('customerId jobId')
      .skip(skip)
      .limit(limit)
      .sort({ invoiceDate: sort === 'asc' ? 1 : -1 });

    const total = await Invoice.countDocuments(query);

    res.json({
      data: invoices,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    fail(res, error, 'Failed to get invoices');
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customerId jobId quoteId');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    fail(res, error, 'Failed to get invoice');
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    let update = { ...req.body, updatedAt: new Date() };

    if (req.body.lineItems) {
      const totals = await buildTotals(req.body.lineItems);
      update = { ...update, ...totals };
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    fail(res, error, 'Failed to update invoice');
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { amountPaid, paymentMethod } = req.body;

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'A positive payment amount is required' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.amountPaid += amountPaid;
    invoice.paymentMethod = paymentMethod || invoice.paymentMethod;

    if (invoice.amountPaid >= invoice.totalAmount) {
      invoice.paymentStatus = 'paid';
    } else if (invoice.amountPaid > 0) {
      invoice.paymentStatus = 'partial';
    }

    await invoice.save();
    res.json(invoice);
  } catch (error) {
    fail(res, error, 'Failed to record payment');
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Invoice deleted' });
  } catch (error) {
    fail(res, error, 'Failed to delete invoice');
  }
};

exports.getCustomerInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ customerId: req.params.customerId })
      .sort({ invoiceDate: -1 });
    res.json(invoices);
  } catch (error) {
    fail(res, error, 'Failed to get invoices');
  }
};

exports.uploadInvoiceCopy = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'An invoice file is required' });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { fileLocation: /uploads/, updatedAt: new Date() },
      { new: true }
    );
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    fail(res, error, 'Failed to store invoice copy');
  }
};
