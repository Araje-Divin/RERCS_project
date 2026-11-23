// Admin tools: create/list/delete users, and list responders.
const bcrypt = require('bcryptjs');
const pool = require('../config/db');

const isValidEmail = (email) =>
  email.length <= 150 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isOptionalText = (value, maxLength) =>
  value == null ||
  (typeof value === 'string' && value.trim().length <= maxLength);

const rollback = async (client) => {
  try {
    await client.query('ROLLBACK');
  } catch (err) {
    console.error('Could not roll back transaction:', err);
  }
};

// POST /api/users  (admin only)
// Creates a dispatcher, responder or another admin.
exports.createUser = async (req, res) => {
  const {
    name, email, phone, address, password, role,
    responder_type, unit, badge_number, license_number, station,
  } = req.body || {};

  if (
    typeof name !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    !name.trim() ||
    !email.trim() ||
    !password ||
    !role
  ) {
    return res
      .status(400)
      .json({ message: 'Name, email, password and role are required' });
  }
  if (!['dispatcher', 'responder', 'admin'].includes(role)) {
    return res
      .status(400)
      .json({ message: 'Role must be dispatcher, responder or admin' });
  }
  if (name.trim().length > 100) {
    return res
      .status(400)
      .json({ message: 'Name must be 100 characters or fewer' });
  }
  const cleanEmail = email.trim().toLowerCase();
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
    !isOptionalText(phone, 20) ||
    !isOptionalText(address, 255) ||
    !isOptionalText(unit, 100) ||
    !isOptionalText(badge_number, 50) ||
    !isOptionalText(license_number, 50) ||
    !isOptionalText(station, 100)
  ) {
    return res
      .status(400)
      .json({ message: 'A supplied user field is invalid or too long' });
  }
  if (
    role === 'responder' &&
    !['police', 'medical', 'fire', 'other'].includes(responder_type)
  ) {
    return res
      .status(400)
      .json({ message: 'responder_type must be police, medical, fire or other' });
  }

  let client;
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    client = await pool.connect();
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [
      cleanEmail,
    ]);
    if (existing.rows.length > 0) {
      await rollback(client);
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, address, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role`,
      [
        name.trim(),
        cleanEmail,
        phone?.trim() || null,
        address?.trim() || null,
        passwordHash,
        role,
      ]
    );
    const user = userResult.rows[0];

    if (role === 'responder') {
      await client.query(
        `INSERT INTO responders
           (user_id, responder_type, unit, badge_number, license_number, station)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          responder_type,
          unit?.trim() || null,
          badge_number?.trim() || null,
          license_number?.trim() || null,
          station?.trim() || null,
        ]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'User created', user });
  } catch (err) {
    if (client) await rollback(client);
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    if (client) client.release();
  }
};

// GET /api/users  (admin only)
exports.getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, role, created_at
       FROM users ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/users/:id  (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (userId === Number(req.user.id)) {
      return res
        .status(400)
        .json({ message: 'You cannot delete your own account' });
    }

    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [
      userId,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    // 23503 = this user is still linked to incidents
    if (err.code === '23503') {
      return res.status(409).json({
        message: 'This user has incident records and cannot be deleted',
      });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/users/responders?type=police&status=available  (dispatcher, admin)
exports.getResponders = async (req, res) => {
  try {
    const { type, status } = req.query;
    const conditions = [];
    const values = [];

    if (
      type &&
      (typeof type !== 'string' ||
        !['police', 'medical', 'fire', 'other'].includes(type))
    ) {
      return res.status(400).json({ message: 'Invalid responder type' });
    }
    if (
      status &&
      (typeof status !== 'string' ||
        !['available', 'busy', 'offline'].includes(status))
    ) {
      return res.status(400).json({ message: 'Invalid responder status' });
    }

    if (type) {
      values.push(type);
      conditions.push(`r.responder_type = $${values.length}`);
    }
    if (status) {
      values.push(status);
      conditions.push(`r.status = $${values.length}`);
    }

    let query = `
      SELECT r.id, u.name, u.phone, r.responder_type, r.unit, r.status
      FROM responders r
      JOIN users u ON u.id = r.user_id`;
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.name';

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
