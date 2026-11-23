const { afterEach, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const authController = require('../src/controllers/authController');
const incidentController = require('../src/controllers/incidentController');
const userController = require('../src/controllers/userController');
const { requireRole, verifyToken } = require('../src/middleware/authMiddleware');

const originalQuery = pool.query;
const originalConnect = pool.connect;
const originalJwtSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret-for-node-test-only';
  pool.query = async () => {
    throw new Error('Unexpected database query in test');
  };
  pool.connect = async () => {
    throw new Error('Unexpected database connection in test');
  };
});

afterEach(() => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
});

const makeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const invoke = async (handler, { body = {}, user, params = {}, query = {} } = {}) => {
  const res = makeResponse();
  await handler({ body, user, params, query }, res);
  return res;
};

const installClient = (respond) => {
  const calls = [];
  const client = {
    async query(sql, params = []) {
      calls.push({ sql, params });
      return (await respond(sql, params)) || { rows: [] };
    },
    release() {},
  };
  pool.connect = async () => client;
  return calls;
};

test('citizen registration rejects invalid email before using the database', async () => {
  const response = await invoke(authController.register, {
    body: {
      name: 'Test Citizen',
      email: 'not-an-email',
      password: 'valid-password',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /valid email/i);
});

test('citizen registration normalizes email and stores a password hash', async () => {
  const calls = [];
  pool.query = async (sql, params) => {
    calls.push({ sql, params });
    if (sql.startsWith('SELECT id FROM users')) return { rows: [] };
    return {
      rows: [{ id: 5, name: 'Test Citizen', email: 'citizen@example.com', role: 'citizen' }],
    };
  };

  const response = await invoke(authController.register, {
    body: {
      name: ' Test Citizen ',
      email: ' CITIZEN@example.com ',
      phone: ' 0780000000 ',
      password: 'valid-password',
    },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.user.role, 'citizen');
  assert.equal(response.body.user.email, 'citizen@example.com');
  assert.equal(calls[1].params[1], 'citizen@example.com');
  assert.notEqual(calls[1].params[4], 'valid-password');
  assert.equal(await bcrypt.compare('valid-password', calls[1].params[4]), true);
  assert.equal(jwt.verify(response.body.token, process.env.JWT_SECRET).role, 'citizen');
});

test('login accepts an email-like username and returns no password hash', async () => {
  const passwordHash = await bcrypt.hash('test-password', 4);
  let queriedEmail;
  pool.query = async (_sql, params) => {
    queriedEmail = params[0];
    return {
      rows: [{
        id: 8,
        name: 'System Admin',
        email: 'admin@999',
        role: 'admin',
        password_hash: passwordHash,
      }],
    };
  };

  const response = await invoke(authController.login, {
    body: { email: ' ADMIN@999 ', password: 'test-password' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(queriedEmail, 'admin@999');
  assert.equal(response.body.user.role, 'admin');
  assert.equal(Object.hasOwn(response.body.user, 'password_hash'), false);
});

test('login rejects an incorrect password', async () => {
  pool.query = async () => ({
    rows: [{
      id: 8,
      name: 'System Admin',
      email: 'admin@example.com',
      role: 'admin',
      password_hash: await bcrypt.hash('correct-password', 4),
    }],
  });

  const response = await invoke(authController.login, {
    body: { email: 'admin@example.com', password: 'wrong-password' },
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.message, 'Wrong email or password');
});

test('role middleware rejects a citizen from a dispatcher-only action', () => {
  const response = makeResponse();
  let proceeded = false;

  requireRole('dispatcher')({ user: { role: 'citizen' } }, response, () => {
    proceeded = true;
  });

  assert.equal(response.statusCode, 403);
  assert.equal(proceeded, false);
});

test('token middleware rejects requests without a bearer token', () => {
  const response = makeResponse();
  let proceeded = false;

  verifyToken({ headers: {} }, response, () => {
    proceeded = true;
  });

  assert.equal(response.statusCode, 401);
  assert.equal(proceeded, false);
});

test('admin can create an Other responder', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT id FROM users')) return { rows: [] };
    if (sql.includes('INSERT INTO users')) {
      return {
        rows: [{ id: 12, name: 'Rescue Team', email: 'rescue@example.com', role: 'responder' }],
      };
    }
    return { rows: [] };
  });

  const response = await invoke(userController.createUser, {
    user: { id: 1, role: 'admin' },
    body: {
      name: 'Rescue Team',
      email: 'rescue@example.com',
      password: 'test-password',
      role: 'responder',
      responder_type: 'other',
      unit: 'Rescue unit',
    },
  });

  assert.equal(response.statusCode, 201);
  const responderInsert = calls.find(({ sql }) => sql.includes('INSERT INTO responders'));
  assert.ok(responderInsert);
  assert.equal(responderInsert.params[1], 'other');
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('user creation rejects an unknown responder type without opening a transaction', async () => {
  const response = await invoke(userController.createUser, {
    body: {
      name: 'Unknown Unit',
      email: 'unknown@example.com',
      password: 'test-password',
      role: 'responder',
      responder_type: 'unknown',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /responder_type/i);
});

test('responder listing supports filtering by the Other type', async () => {
  let query;
  let params;
  pool.query = async (sql, values) => {
    query = sql;
    params = values;
    return { rows: [{ id: 2, responder_type: 'other', status: 'available' }] };
  };

  const response = await invoke(userController.getResponders, {
    query: { type: 'other', status: 'available' },
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(params, ['other', 'available']);
  assert.match(query, /r\.responder_type = \$1/);
  assert.match(query, /r\.status = \$2/);
});

test('incident reporting rejects invalid coordinates before connecting to the database', async () => {
  const response = await invoke(incidentController.createIncident, {
    user: { id: 3, role: 'citizen' },
    body: {
      type: 'Accident',
      location: 'Kigali',
      latitude: 91,
      longitude: 30,
      description: 'Vehicle collision',
    },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /coordinates/i);
});

test('incident reporting records the report and its initial history entry', async () => {
  const calls = installClient(async (sql) => {
    if (sql.includes('INSERT INTO incidents')) {
      return {
        rows: [{
          id: 21,
          citizen_id: 3,
          type: 'Accident',
          location: 'Kigali',
          status: 'Reported',
        }],
      };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.createIncident, {
    user: { id: 3, role: 'citizen' },
    body: {
      type: 'Accident',
      location: ' Kigali ',
      latitude: -1.95,
      longitude: 30.06,
      description: ' Vehicle collision ',
    },
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.incident.status, 'Reported');
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes('INSERT INTO incident_updates') &&
    params[1] === 'Reported' &&
    params[3] === 3
  ));
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('dispatcher verifies a reported incident and records the status change', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 21, status: 'Reported' }] };
    }
    if (sql.includes('UPDATE incidents')) {
      return { rows: [{ id: 21, status: 'Verified' }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.verifyIncident, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '21' },
    body: { valid: true },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.incident.status, 'Verified');
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes('INSERT INTO incident_updates') && params[1] === 'Verified'
  ));
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('dispatcher cannot assign an incident before verification', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 21, status: 'Reported' }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.assignResponder, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '21' },
    body: { responder_id: 7 },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /verified/i);
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => sql.includes("SET status = 'Assigned'")), false);
});

test('dispatcher can assign an available compatible responder to an accident', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 21, type: 'Accident', status: 'Verified' }] };
    }
    if (sql.startsWith('SELECT * FROM responders')) {
      return { rows: [{ id: 7, responder_type: 'medical', status: 'available' }] };
    }
    if (sql.includes('UPDATE incidents')) {
      return { rows: [{ id: 21, status: 'Assigned', responder_id: 7 }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.assignResponder, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '21' },
    body: { responder_id: 7 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.incident.status, 'Assigned');
  assert.equal(response.body.incident.responder_id, 7);
  assert.ok(calls.some(({ sql }) => sql.includes("UPDATE responders SET status = 'busy'")));
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes('INSERT INTO incident_updates') && params[1] === 'Assigned'
  ));
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('dispatcher can assign an available Other responder to an Other incident', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 23, type: 'Other', status: 'Verified' }] };
    }
    if (sql.startsWith('SELECT * FROM responders')) {
      return { rows: [{ id: 10, responder_type: 'other', status: 'available' }] };
    }
    if (sql.includes('UPDATE incidents')) {
      return { rows: [{ id: 23, status: 'Assigned', responder_id: 10 }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.assignResponder, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '23' },
    body: { responder_id: 10 },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.incident.status, 'Assigned');
  assert.equal(response.body.incident.responder_id, 10);
  assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
});

test('dispatcher cannot assign an incompatible responder', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 22, type: 'Fire', status: 'Verified' }] };
    }
    if (sql.startsWith('SELECT * FROM responders')) {
      return { rows: [{ id: 7, responder_type: 'police', status: 'available' }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.assignResponder, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '22' },
    body: { responder_id: 7 },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /cannot be assigned/i);
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
  assert.equal(calls.some(({ sql }) => sql.includes("SET status = 'Assigned'")), false);
});

test('dispatcher cannot assign a responder who is not available', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT * FROM incidents')) {
      return { rows: [{ id: 21, type: 'Accident', status: 'Verified' }] };
    }
    if (sql.startsWith('SELECT * FROM responders')) {
      return { rows: [{ id: 7, responder_type: 'police', status: 'busy' }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.assignResponder, {
    user: { id: 4, role: 'dispatcher' },
    params: { id: '21' },
    body: { responder_id: 7 },
  });

  assert.equal(response.statusCode, 400);
  assert.match(response.body.message, /not available/i);
  assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
});

test('assigned responder can update progress and completion frees the responder', async () => {
  const calls = installClient(async (sql) => {
    if (sql.startsWith('SELECT i.*')) {
      return {
        rows: [{
          id: 21,
          status: 'In Progress',
          my_responder_id: 7,
        }],
      };
    }
    if (sql.startsWith('UPDATE incidents')) {
      return { rows: [{ id: 21, status: 'Completed' }] };
    }
    return { rows: [] };
  });

  const response = await invoke(incidentController.updateStatus, {
    user: { id: 9, role: 'responder' },
    params: { id: '21' },
    body: { status: 'Completed', note: 'Resolved' },
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.incident.status, 'Completed');
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes("UPDATE responders SET status = 'available'") && params[0] === 7
  ));
  assert.ok(calls.some(({ sql, params }) =>
    sql.includes('INSERT INTO incident_updates') &&
    params[1] === 'Completed' &&
    params[3] === 9
  ));
});

test('dispatcher can close a completed incident but not an active one', async (t) => {
  await t.test('completed incident closes and receives a history entry', async () => {
    const calls = installClient(async (sql) => {
      if (sql.startsWith('SELECT * FROM incidents')) {
        return { rows: [{ id: 21, status: 'Completed' }] };
      }
      if (sql.includes('UPDATE incidents')) {
        return { rows: [{ id: 21, status: 'Closed' }] };
      }
      return { rows: [] };
    });

    const response = await invoke(incidentController.closeIncident, {
      user: { id: 4, role: 'dispatcher' },
      params: { id: '21' },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.incident.status, 'Closed');
    assert.ok(calls.some(({ sql }) => sql === 'COMMIT'));
  });

  await t.test('active incident remains unchanged', async () => {
    const calls = installClient(async (sql) => {
      if (sql.startsWith('SELECT * FROM incidents')) {
        return { rows: [{ id: 21, status: 'Assigned' }] };
      }
      return { rows: [] };
    });

    const response = await invoke(incidentController.closeIncident, {
      user: { id: 4, role: 'dispatcher' },
      params: { id: '21' },
    });

    assert.equal(response.statusCode, 400);
    assert.ok(calls.some(({ sql }) => sql === 'ROLLBACK'));
    assert.equal(calls.some(({ sql }) => sql.includes('UPDATE incidents')), false);
  });
});
