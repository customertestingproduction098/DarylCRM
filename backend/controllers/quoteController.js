const Quote = require('../models/Quote');
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

exports.createQuote = async (req, res) => {
  try {
    const { customerId, jobId, lineItems, notes, validUntil, status } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID required' });
    }

    const totals = await buildTotals(lineItems);

    const quote = new Quote({
      customerId,
      jobId,
      notes,
      status: status || 'draft',
      ...totals,
      quoteDate: new Date(),
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdBy: req.user.id
    });

    await quote.save();
    res.status(201).json(quote);
  } catch (error) {
    fail(res, error, 'Failed to create quote');
  }
};

exports.getQuotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { status, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      const matching = await Customer.find({
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      query.customerId = { $in: matching.map((c) => c._id) };
    }

    const quotes = await Quote.find(query)
      .populate('customerId jobId')
      .skip(skip)
      .limit(limit)
      .sort({ quoteDate: -1 });

    const total = await Quote.countDocuments(query);

    res.json({
      data: quotes,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    fail(res, error, 'Failed to get quotes');
  }
};

exports.getQuoteById = async (req, res) => {
  try {
    const quote = await Quote.findById(req.params.id).populate('customerId jobId');
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(quote);
  } catch (error) {
    fail(res, error, 'Failed to get quote');
  }
};

exports.updateQuote = async (req, res) => {
  try {
    let update = { ...req.body, updatedAt: new Date() };

    if (req.body.lineItems) {
      const totals = await buildTotals(req.body.lineItems);
      update = { ...update, ...totals };
    }

    const quote = await Quote.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(quote);
  } catch (error) {
    fail(res, error, 'Failed to update quote');
  }
};

exports.updateQuoteStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['draft', 'sent', 'accepted', 'rejected', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const quote = await Quote.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json(quote);
  } catch (error) {
    fail(res, error, 'Failed to update quote status');
  }
};

exports.deleteQuote = async (req, res) => {
  try {
    const quote = await Quote.findByIdAndDelete(req.params.id);
    if (!quote) {
      return res.status(404).json({ error: 'Quote not found' });
    }
    res.json({ message: 'Quote deleted' });
  } catch (error) {
    fail(res, error, 'Failed to delete quote');
  }
};
