const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, business: u.business });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, businessName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (await User.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      business: { name: businessName || name },
    });
    req.session.userId = user._id.toString();
    res.status(201).json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    req.session.userId = user._id.toString();
    res.json(publicUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Please log in first' });
  res.json(publicUser(user));
});

// Update business profile that appears on every invoice
router.put('/profile', requireAuth, async (req, res) => {
  const { name, business } = req.body;
  const user = await User.findById(req.session.userId);
  if (name) user.name = name;
  if (business) {
    user.business = {
      name: business.name ?? user.business.name,
      address: business.address ?? user.business.address,
      phone: business.phone ?? user.business.phone,
      gstin: business.gstin ?? user.business.gstin,
    };
  }
  await user.save();
  res.json(publicUser(user));
});

module.exports = router;
