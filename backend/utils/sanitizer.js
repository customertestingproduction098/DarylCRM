const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove dangerous characters that could be used in injection
  return input
    .replace(/[`~!@#$%^&*()=+[\]{};:'",<>/?\\|]/g, '')
    .trim();
};

const sanitizePhoneNumber = (phone) => {
  if (typeof phone !== 'string') return '';
  return phone.replace(/[^0-9+\-().\s]/g, '').trim();
};

const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email.toLowerCase().trim();
};

const escapeRegex = (string) => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  sanitizeInput,
  sanitizePhoneNumber,
  sanitizeEmail,
  escapeRegex
};
