// Centralized controller error responder.
// Maps invalid ObjectId params to 404 (basic error handling, not security).
exports.fail = (res, error, fallbackMessage) => {
  if (error.name === 'CastError') {
    return res.status(404).json({ error: 'Resource not found' });
  }
  console.error(`${fallbackMessage}:`, error.message);
  return res.status(500).json({ error: fallbackMessage });
};
