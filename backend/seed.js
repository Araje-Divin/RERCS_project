// Creates test accounts (admin, dispatcher and all responder types).
// Run once with: npm run seed
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const PASSWORD = process.env.SEED_PASSWORD;

const users = [
  { name: 'System Admin', email: 'admin@gmail.con', role: 'admin' },
  { name: 'Test Dispatcher', email: 'dispatcher@rercs.rw', role: 'dispatcher' },
  {
    name: 'Test Police Officer',
    email: 'police@rercs.rw',
    role: 'responder',
    type: 'police',
    unit: 'Kigali Police Unit 1',
    badge: 'P-001',
  },
  {
    name: 'Test Medical Responder',
    email: 'medical@rercs.rw',
    role: 'responder',
    type: 'medical',
    unit: 'Kigali Ambulance Unit 1',
    license: 'M-001',
  },
  {
    name: 'Test Fire Responder',
    email: 'fire@rercs.rw',
    role: 'responder',
    type: 'fire',
    unit: 'Kigali Fire Unit 1',
    station: 'Central Fire Station',
  },
  {
    name: 'Test Other Responder',
    email: 'other@rercs.rw',
    role: 'responder',
    type: 'other',
    unit: 'Kigali Disaster Unit 1',
  },
];

async function seed() {
  try {
    if (!PASSWORD || Buffer.byteLength(PASSWORD, 'utf8') < 8 || Buffer.byteLength(PASSWORD, 'utf8') > 72) {
      throw new Error('Set SEED_PASSWORD to a password between 8 and 72 bytes.');
    }

    const hash = await bcrypt.hash(PASSWORD, 10);

    for (const u of users) {
      // ON CONFLICT DO NOTHING = skip if the email already exists
      const result = await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        [u.name, u.email, hash, u.role]
      );

      if (result.rows.length > 0 && u.role === 'responder') {
        await pool.query(
          `INSERT INTO responders (
             user_id,
             responder_type,
             unit,
             badge_number,
             license_number,
             station
           )
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            result.rows[0].id,
            u.type,
            u.unit,
            u.badge || null,
            u.license || null,
            u.station || null,
          ]
        );
      }
      console.log(result.rows.length > 0 ? `Created: ${u.email}` : `Already exists: ${u.email}`);
    }

    console.log('Done. Sample accounts share the configured SEED_PASSWORD.');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

seed();
