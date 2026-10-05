const { body, param, query, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Customer validation
const validateCustomer = [
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name required')
    .isLength({ min: 1, max: 50 }).withMessage('First name must be 1-50 chars'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name required')
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be 1-50 chars'),
  body('phoneNumber')
    .trim()
    .matches(/^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/)
    .withMessage('Invalid phone number format'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Invalid email address'),
  body('type')
    .optional()
    .isIn(['vehicle', 'residential']).withMessage('Invalid customer type'),
  handleValidationErrors
];

// Job validation
const validateJob = [
  body('customerId')
    .notEmpty().withMessage('Customer ID required')
    .isMongoId().withMessage('Invalid customer ID'),
  body('jobType')
    .isIn(['vehicle_repair', 'vehicle_replacement', 'residential_repair', 'residential_replacement'])
    .withMessage('Invalid job type'),
  body('appointmentDateTime')
    .notEmpty().withMessage('Appointment date/time required')
    .isISO8601().withMessage('Invalid date format'),
  handleValidationErrors
];

// Quote validation
const validateQuote = [
  body('customerId')
    .notEmpty().isMongoId().withMessage('Invalid customer ID'),
  body('lineItems')
    .isArray({ min: 1 }).withMessage('At least one line item required'),
  body('lineItems.*.description')
    .trim().notEmpty().withMessage('Item description required'),
  body('lineItems.*.quantity')
    .isInt({ min: 1 }).withMessage('Quantity must be positive integer'),
  body('lineItems.*.unitPrice')
    .isFloat({ min: 0 }).withMessage('Price must be positive number'),
  handleValidationErrors
];

// Invoice validation
const validateInvoice = [
  body('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('lineItems').isArray({ min: 1 }).withMessage('At least one line item required'),
  handleValidationErrors
];

// Payment validation
const validatePayment = [
  body('amountPaid')
    .isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('paymentMethod')
    .trim()
    .notEmpty().withMessage('Payment method required'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

// Register validation
const validateRegister = [
  body('firstName').trim().notEmpty().isLength({ min: 1, max: 50 }),
  body('lastName').trim().notEmpty().isLength({ min: 1, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be 8+ characters')
    .matches(/[A-Z]/).withMessage('Password must include uppercase letter')
    .matches(/[a-z]/).withMessage('Password must include lowercase letter')
    .matches(/[0-9]/).withMessage('Password must include a number'),
  handleValidationErrors
];

// Note validation
const validateNote = [
  body('customerId').isMongoId().withMessage('Invalid customer ID'),
  body('content').trim().notEmpty().withMessage('Content cannot be empty'),
  handleValidationErrors
];

module.exports = {
  validateCustomer,
  validateJob,
  validateQuote,
  validateInvoice,
  validatePayment,
  validateLogin,
  validateRegister,
  validateNote
};
