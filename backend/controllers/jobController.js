const Job = require('../models/Job');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const { fail } = require('../utils/errorHandler');

exports.createJob = async (req, res) => {
  try {
    const {
      customerId,
      vehicleId,
      jobType,
      appointmentDateTime,
      location,
      poNumber,
      supplierName,
      supplierOrderedFrom,
      supplierOrderId,
      specifications,
      vehicle
    } = req.body;

    if (!customerId || !jobType || !appointmentDateTime) {
      return res.status(400).json({ error: 'Customer, job type, and appointment date/time required' });
    }

    if (jobType.startsWith('residential') && !location) {
      return res.status(400).json({ error: 'Job location (address) required for house jobs' });
    }

    // Vehicle details captured during intake are stored on the customer's vehicle record
    let resolvedVehicleId = vehicleId;
    if (!resolvedVehicleId && vehicle && vehicle.year && vehicle.make) {
      const query = { customerId, year: Number(vehicle.year), make: vehicle.make };
      if (vehicle.model) query.model = vehicle.model;

      let doc = await Vehicle.findOne(query);
      if (!doc) {
        doc = await Vehicle.create({ customerId, ...vehicle });
      } else if (vehicle.glassCode || vehicle.insuranceNumber) {
        doc.glassCode = vehicle.glassCode || doc.glassCode;
        doc.insuranceNumber = vehicle.insuranceNumber || doc.insuranceNumber;
        await doc.save();
      }
      resolvedVehicleId = doc._id;
    }

    const job = new Job({
      customerId,
      vehicleId: resolvedVehicleId,
      jobType,
      appointmentDateTime,
      location,
      poNumber,
      supplierName,
      supplierOrderedFrom,
      supplierOrderId,
      specifications,
      jobStatus: 'scheduled'
    });

    await job.save();

    await Customer.findByIdAndUpdate(customerId, { lastContactDate: new Date() });

    res.status(201).json(job);
  } catch (error) {
    fail(res, error, 'Failed to create job');
  }
};

exports.getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;
    const { status, search, from, to, sort } = req.query;

    const query = {};
    if (status) query.jobStatus = status;
    if (from || to) {
      query.appointmentDateTime = {};
      if (from) query.appointmentDateTime.$gte = new Date(from);
      if (to) query.appointmentDateTime.$lte = new Date(to);
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

    const jobs = await Job.find(query)
      .populate('customerId vehicleId')
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDateTime: sort === 'asc' ? 1 : -1 });

    const total = await Job.countDocuments(query);

    res.json({
      data: jobs,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    fail(res, error, 'Failed to get jobs');
  }
};

exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('customerId vehicleId quoteId invoiceId');
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to get job');
  }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to update job');
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['scheduled', 'in_progress', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { jobStatus: status, updatedAt: new Date() },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to update job status');
  }
};

exports.completeJob = async (req, res) => {
  try {
    const { completionNotes } = req.body;
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      {
        jobStatus: 'completed',
        completedAt: new Date(),
        completionNotes,
        updatedAt: new Date()
      },
      { new: true }
    );
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to complete job');
  }
};

exports.addJobNote = async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Note content required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.notes.push({
      createdBy: req.user.id,
      content,
      createdAt: new Date()
    });

    await job.save();
    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to add note');
  }
};

exports.uploadJobMedia = async (req, res) => {
  try {
    const { slot } = req.body;

    if (!['before', 'after'].includes(slot)) {
      return res.status(400).json({ error: 'Slot must be "before" or "after"' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'A video file is required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.media = job.media || {};
    job.media[`${slot}Video`] = {
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date()
    };
    job.updatedAt = new Date();

    await job.save();
    res.json(job);
  } catch (error) {
    fail(res, error, 'Failed to upload video');
  }
};

exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json({ message: 'Job deleted' });
  } catch (error) {
    fail(res, error, 'Failed to delete job');
  }
};

exports.getJobsByCustomer = async (req, res) => {
  try {
    const jobs = await Job.find({ customerId: req.params.customerId })
      .populate('vehicleId')
      .sort({ appointmentDateTime: -1 });
    res.json(jobs);
  } catch (error) {
    fail(res, error, 'Failed to get customer jobs');
  }
};
