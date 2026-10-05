const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { validateLogin, validateRegister } = require('../middleware/validation');
const {
  register,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.get('/me', authMiddleware, getMe);

module.exports = router;
