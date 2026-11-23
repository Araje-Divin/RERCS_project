// Register (citizens only) and login (everyone).
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const isValidEmail = (email) =>
  email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidLoginIdentifier = (identifier) =>
  isValidEmail(identifier) ||
  (identifier.length <= 150 && /^[^\s@]+@[^\s@]+$/.test(identifier));

// POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body || {};

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length > 100) {
      return res
        .status(400)
        .json({ message: 'Name must be 100 characters or fewer' });
    }
    if (!isValidEmail(cleanEmail)) {
      return res
        .status(400)
        .json({ message: 'Please provide a valid email address' });
    }
    if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      return res
        .status(400)
        .json({ message: 'Password must be 6-72 bytes long' });
    }
    if (
      (phone != null && typeof phone !== 'string') ||
      (address != null && typeof address !== 'string')
    ) {
      return res.status(400).json({ message: 'Phone and address must be text' });
    }

    const cleanPhone = phone?.trim() || null;
    const cleanAddress = address?.trim() || null;
    if (cleanPhone && cleanPhone.length > 20) {
      return res
        .status(400)
        .json({ message: 'Phone must be 20 characters or fewer' });
    }
    if (cleanAddress && cleanAddress.length > 255) {
      return res
        .status(400)
        .json({ message: 'Address must be 255 characters or fewer' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [
      cleanEmail,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, address, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'citizen')
       RETURNING id, name, email, role`,
      [cleanName, cleanEmail, cleanPhone, cleanAddress, passwordHash]
    );

    const user = result.rows[0];
    res.status(201).json({
      message: 'Account created',
      token: createToken(user),
      user,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!isValidLoginIdentifier(cleanEmail)) {
      return res
        .status(400)
        .json({ message: 'Please provide a valid email address' });
    }

    const result = await pool.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = $1',
      [cleanEmail]
    );
    const user = result.rows[0];

    // Same message for both cases, so attackers cannot learn which emails exist
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: 'Wrong email or password' });
    }

    res.json({
      message: 'Login successful',
      token: createToken(user),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/auth/me  (who am I?)
exports.getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, phone, address, role FROM users WHERE id = $1',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
