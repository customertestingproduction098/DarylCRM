const User = require('../models/User');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');

// Helper to sign JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'fallback_secret_for_development',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Helper to set cookie for cross-domain Netlify -> Railway deployment
const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

exports.register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phoneNumber } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcryptjs.genSalt(10);
    const hashedPassword = await bcryptjs.hash(password, salt);

    const user = new User({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      phoneNumber,
      role: role || 'staff',
      isActive: true
    });

    await user.save();
    const token = generateToken(user);
    setAuthCookie(res, token);

    logger.info(`New user registered: ${user.email} (${user.role})`);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Registration failed', { error: error.message });
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required', message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      console.warn(`[AUTH] Login failed: User "${normalizedEmail}" not found in database.`);
      return res.status(401).json({ error: 'Invalid email or password', message: 'Invalid credentials' });
    }

    if (user.isActive === false) {
      console.warn(`[AUTH] Login failed: User "${normalizedEmail}" is deactivated.`);
      return res.status(401).json({ error: 'Account is deactivated. Contact administrator.', message: 'Account is deactivated' });
    }

    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      console.warn(`[AUTH] Login failed: Password mismatch for user "${normalizedEmail}".`);
      return res.status(401).json({ error: 'Invalid email or password', message: 'Invalid credentials' });
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error', { error: error.message });
    res.status(500).json({ error: 'Login failed', message: 'Login failed' });
  }
};

exports.logout = async (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  });
  res.json({ message: 'Logged out successfully' });
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.body.token || req.cookies?.token;
    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_for_development');
    const user = await User.findById(decoded.id);
    if (!user || user.isActive === false) {
      return res.status(401).json({ error: 'Invalid user token' });
    }

    const newToken = generateToken(user);
    setAuthCookie(res, newToken);

    res.json({ token: newToken });
  } catch (error) {
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({ message: 'If that email exists, a password reset link has been dispatched.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

    await user.save();
    logger.info(`Password reset requested for: ${user.email}`);

    res.json({ message: 'If that email exists, a password reset link has been dispatched.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process request' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid token and minimum 8-character password required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired password reset token' });
    }

    const salt = await bcryptjs.genSalt(10);
    user.password = await bcryptjs.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    res.json({ message: 'Password reset successful. You may now log in.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
};
