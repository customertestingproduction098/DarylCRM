const Note = require('../models/Note');
const xss = require('xss');
const logger = require('../utils/logger');

exports.createNote = async (req, res) => {
  try {
    const { customerId, jobId, content } = req.body;

    if (!customerId || !content) {
      return res.status(400).json({ error: 'Customer ID and note content required' });
    }

    // XSS Sanitization: Strip all HTML tags
    const sanitizedContent = xss(content, {
      whiteList: {},
      stripIgnoreTag: true
    });

    const note = new Note({
      customerId,
      jobId,
      content: sanitizedContent,
      createdBy: req.user.id
    });

    await note.save();
    logger.info(`Note created for customer: ${customerId}`);
    res.status(201).json(note);
  } catch (error) {
    logger.error('Failed to create note', { error: error.message });
    res.status(500).json({ error: 'Failed to create note' });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const query = req.query.customerId ? { customerId: req.query.customerId } : {};
    const notes = await Note.find(query)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get notes' });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate('createdBy', 'firstName lastName');
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get note' });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { content } = req.body;
    const sanitizedContent = content ? xss(content, { whiteList: {}, stripIgnoreTag: true }) : undefined;

    const note = await Note.findByIdAndUpdate(
      req.params.id,
      {
        ...(sanitizedContent && { content: sanitizedContent }),
        updatedAt: new Date()
      },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update note' });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
};
