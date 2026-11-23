const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../src/config/db');
const app = require('../src/app');

const originalQuery = pool.query;
const originalConnect = pool.connect;
const testSecret = 'rest-api-test-secret-only';
const state = {
  users: [],
  responders: [],
  incidents: [],
  history: [],
  notifications: [],
};

let server;
let baseUrl;
let nextUserId = 100;
let nextIncidentId = 40;

const findIncident = (id) => state.incidents.find((incident) => incident.id === Number(id));

const addNotification = (userId, incidentId, type, message) => {
  state.notifications.push({
    id: state.notifications.length + 1,
    user_id: userId,
    incident_id: incidentId,
    type,
    message,
    read_at: null,
    created_at: new Date().toISOString(),
  });
};

const runQuery = async (sql, params = []) => {
  if (sql.startsWith('SELECT id FROM users WHERE email =')) {
    const user = state.users.find((item) => item.email === params[0]);
    return { rows: user ? [{ id: user.id }] : [] };
  }

  if (sql.includes('INSERT INTO users')) {
    const [name, email, phone, address, password_hash] = params;
    const role = params[5] || (sql.includes("'citizen'") ? 'citizen' : undefined);
    const user = {
      id: nextUserId++,
      name,
      email,
      phone,
      address,
      password_hash,
      role,
    };
    state.users.push(user);
    return {
      rows: [{ id: user.id, name, email, role }],
    };
  }

  if (sql.includes('SELECT id, name, email, role, password_hash FROM users')) {
    const user = state.users.find((item) => item.email === params[0]);
    return { rows: user ? [{ ...user }] : [] };
  }

  if (sql.includes('SELECT id, name, email, phone, address, role FROM users')) {
    const user = state.users.find((item) => item.id === Number(params[0]));
    if (!user) return { rows: [] };
    return {
      rows: [{
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      }],
    };
  }

  if (sql.trimStart().startsWith('SELECT i.*,')) {
    let incidents = [...state.incidents];
    if (sql.includes('i.status =')) {
      const status = params[params.length - 1];
      incidents = incidents.filter((incident) => incident.status === status);
    }
    return { rows: incidents };
  }

  if (sql.includes('SELECT r.id, u.name, u.phone, r.responder_type')) {
    const responders = state.responders
      .filter((responder) => {
        const typeIndex = sql.includes('r.responder_type =') ? params.findIndex((value) =>
          ['police', 'medical', 'fire', 'other'].includes(value)
        ) : -1;
        const statusIndex = sql.includes('r.status =') ? params.findIndex((value) =>
          ['available', 'busy', 'offline'].includes(value)
        ) : -1;
        return (typeIndex === -1 || responder.responder_type === params[typeIndex]) &&
          (statusIndex === -1 || responder.status === params[statusIndex]);
      })
      .map((responder) => {
        const user = state.users.find((item) => item.id === responder.user_id);
        return {
          id: responder.id,
          name: user.name,
          phone: user.phone,
          responder_type: responder.responder_type,
          unit: responder.unit,
          status: responder.status,
        };
      });
    return { rows: responders };
  }

  if (sql.includes('FROM notifications') && sql.includes('COUNT(*)')) {
    const unreadCount = state.notifications.filter(
      (notification) => notification.user_id === params[0] && !notification.read_at
    ).length;
    return { rows: [{ unread_count: unreadCount }] };
  }

  if (sql.includes('FROM notifications') && sql.includes('WHERE user_id = $1')) {
    return {
      rows: state.notifications
        .filter((notification) => notification.user_id === params[0])
        .sort((a, b) => b.id - a.id)
        .slice(0, 50)
        .map(({ id, incident_id, type, message, read_at, created_at }) =>
          ({ id, incident_id, type, message, read_at, created_at })
        ),
    };
  }

  if (sql.includes('UPDATE notifications') && sql.includes('WHERE id = $1')) {
    const notification = state.notifications.find(
      (item) => item.id === Number(params[0]) && item.user_id === params[1]
    );
    if (!notification) return { rows: [] };
    notification.read_at ||= new Date().toISOString();
    return { rows: [{ id: notification.id, read_at: notification.read_at }] };
  }

  if (sql.includes('UPDATE notifications') && sql.includes('WHERE user_id = $1')) {
    const unread = state.notifications.filter(
      (item) => item.user_id === params[0] && !item.read_at
    );
    for (const notification of unread) {
      notification.read_at = new Date().toISOString();
    }
    return { rows: [], rowCount: unread.length };
  }

  throw new Error(`Unexpected pool query in REST test: ${sql}`);
};

const runClientQuery = async (sql, params = []) => {
  if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
    return { rows: [] };
  }

  if (sql.startsWith('SELECT id FROM users WHERE email =')) {
    const user = state.users.find((item) => item.email === params[0]);
    return { rows: user ? [{ id: user.id }] : [] };
  }

  if (sql.includes('INSERT INTO users')) {
    const [name, email, phone, address, password_hash, role] = params;
    const user = {
      id: nextUserId++,
      name,
      email,
      phone,
      address,
      password_hash,
      role,
    };
    state.users.push(user);
    return { rows: [{ id: user.id, name, email, role }] };
  }

  if (sql.includes('INSERT INTO incidents')) {
    const [citizenId, type, location, latitude, longitude, description] = params;
    const incident = {
      id: ++nextIncidentId,
      citizen_id: citizenId,
      type,
      location,
      latitude,
      longitude,
      description,
      status: 'Reported',
      dispatcher_id: null,
      responder_id: null,
    };
    state.incidents.push(incident);
    return { rows: [{ ...incident }] };
  }

  if (sql.includes('INSERT INTO incident_updates')) {
    const [incident_id, status, note, updated_by] = params;
    state.history.push({ incident_id, status, note, updated_by });
    return { rows: [] };
  }

  if (sql.includes('INSERT INTO notifications')) {
    const [userId, incidentId, type, message] = params;
    addNotification(userId, incidentId, type, message);
    return { rows: [] };
  }

  if (sql.startsWith("SELECT id FROM users WHERE role = 'dispatcher'")) {
    return {
      rows: state.users.filter((user) => user.role === 'dispatcher').map(({ id }) => ({ id })),
    };
  }

  if (sql.includes('INSERT INTO responders')) {
    const [user_id, responder_type, unit, badge_number, license_number, station] = params;
    const responder = {
      id: state.responders.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      user_id,
      responder_type,
      unit,
      badge_number,
      license_number,
      station,
      status: 'available',
    };
    state.responders.push(responder);
    return { rows: [] };
  }

  if (sql.trimStart().startsWith('SELECT * FROM incidents WHERE id =')) {
    const incident = findIncident(params[0]);
    return { rows: incident ? [{ ...incident }] : [] };
  }

  if (sql.trimStart().startsWith('SELECT * FROM responders WHERE id =')) {
    const responder = state.responders.find((item) => item.id === Number(params[0]));
    return { rows: responder ? [{ ...responder }] : [] };
  }

  if (sql.includes('SELECT i.*, r.id AS my_responder_id')) {
    const [incidentId, userId] = params;
    const incident = findIncident(incidentId);
    const responder = state.responders.find((item) =>
      item.id === incident?.responder_id && item.user_id === userId
    );
    return {
      rows: incident && responder
        ? [{ ...incident, my_responder_id: responder.id }]
        : [],
    };
  }

  if (sql.includes("SET status = 'Assigned'")) {
    const [responderId, dispatcherId, incidentId] = params;
    const incident = findIncident(incidentId);
    incident.status = 'Assigned';
    incident.responder_id = responderId;
    incident.dispatcher_id = dispatcherId;
    return { rows: [{ ...incident }] };
  }

  if (sql.includes("UPDATE responders SET status = 'busy'")) {
    const responder = state.responders.find((item) => item.id === Number(params[0]));
    responder.status = 'busy';
    return { rows: [] };
  }

  if (sql.includes("UPDATE responders SET status = 'available'")) {
    const responder = state.responders.find((item) => item.id === Number(params[0]));
    responder.status = 'available';
    return { rows: [] };
  }

  if (sql.includes('UPDATE incidents') && sql.includes('SET status = $1')) {
    const status = params[0];
    const incidentId = sql.includes('dispatcher_id = $2') ? params[2] : params[1];
    const incident = findIncident(incidentId);
    incident.status = status;
    return { rows: [{ ...incident }] };
  }

  if (sql.includes("UPDATE incidents SET status = 'Closed'")) {
    const incident = findIncident(params[0]);
    incident.status = 'Closed';
    return { rows: [{ ...incident }] };
  }

  throw new Error(`Unexpected transaction query in REST test: ${sql}`);
};

const request = async (path, { method = 'GET', token, body, rawBody } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || rawBody !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();
  return { response, payload };
};

before(async () => {
  process.env.JWT_SECRET = testSecret;
  const adminPassword = await bcrypt.hash('admin-test123', 4);
  const dispatcherPassword = await bcrypt.hash('dispatcher-test123', 4);
  const responderPassword = await bcrypt.hash('responder-test123', 4);
  state.users.push(
    {
      id: 1,
      name: 'Test Admin',
      email: 'admin@example.test',
      phone: null,
      address: null,
      password_hash: adminPassword,
      role: 'admin',
    },
    {
      id: 2,
      name: 'Test Dispatcher',
      email: 'dispatcher@example.test',
      phone: null,
      address: null,
      password_hash: dispatcherPassword,
      role: 'dispatcher',
    },
    {
      id: 3,
      name: 'Test Medical Responder',
      email: 'responder@example.test',
      phone: null,
      address: null,
      password_hash: responderPassword,
      role: 'responder',
    }
  );
  state.responders.push({
    id: 9,
    user_id: 3,
    responder_type: 'medical',
    unit: 'Test Medical Unit',
    status: 'available',
  });

  pool.query = runQuery;
  pool.connect = async () => ({
    query: runClientQuery,
    release() {},
  });

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
  pool.query = originalQuery;
  pool.connect = originalConnect;
});

test('REST API supports citizen reporting through dispatcher assignment and responder completion', async () => {
  const root = await request('/');
  assert.equal(root.response.status, 200);
  assert.deepEqual(root.payload, { message: 'RERCS API is running' });

  const docs = await request('/api-docs.json');
  assert.equal(docs.response.status, 200);
  assert.equal(docs.payload.openapi, '3.0.3');
  for (const path of [
    '/api/auth/register',
    '/api/auth/login',
    '/api/auth/me',
    '/api/incidents',
    '/api/incidents/{id}/verify',
    '/api/incidents/{id}/assign',
    '/api/users/responders',
    '/api/notifications',
    '/api/notifications/read-all',
  ]) {
    assert.ok(docs.payload.paths[path], `OpenAPI spec missing ${path}`);
  }
  assert.equal(docs.payload.components.securitySchemes.bearerAuth.scheme, 'bearer');

  const swaggerUiPage = await request('/api-docs/');
  assert.equal(swaggerUiPage.response.status, 200);
  assert.match(swaggerUiPage.payload, /swagger-ui/i);

  const missingAuth = await request('/api/incidents');
  assert.equal(missingAuth.response.status, 401);
  assert.equal(missingAuth.payload.message, 'Please log in first');

  const invalidJson = await request('/api/auth/login', {
    method: 'POST',
    rawBody: '{invalid',
  });
  assert.equal(invalidJson.response.status, 400);
  assert.match(invalidJson.payload.message, /valid json/i);

  const invalidId = await request('/api/incidents/not-an-id', {
    token: jwt.sign({ id: 2, role: 'dispatcher' }, testSecret),
  });
  assert.equal(invalidId.response.status, 400);
  assert.equal(invalidId.payload.message, 'Invalid id');

  const registration = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Test Citizen',
      email: 'citizen@example.test',
      phone: '0780000000',
      password: 'citizen-test123',
    },
  });
  assert.equal(registration.response.status, 201);
  assert.equal(registration.payload.user?.role, 'citizen', JSON.stringify(registration.payload));
  assert.equal(typeof registration.payload.token, 'string');
  const citizenToken = registration.payload.token;
  const citizenId = registration.payload.user.id;

  const citizenMe = await request('/api/auth/me', { token: citizenToken });
  assert.equal(citizenMe.response.status, 200);
  assert.equal(citizenMe.payload.email, 'citizen@example.test');

  const dispatcherLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'dispatcher@example.test',
      password: 'dispatcher-test123',
    },
  });
  assert.equal(dispatcherLogin.response.status, 200);
  const dispatcherToken = dispatcherLogin.payload.token;
  const dispatcherId = 2;

  const deniedAdminAction = await request('/api/users', {
    method: 'POST',
    token: dispatcherToken,
    body: {
      name: 'Unauthorized User',
      email: 'unauthorized@example.test',
      password: 'user-test123',
      role: 'dispatcher',
    },
  });
  assert.equal(deniedAdminAction.response.status, 403);

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@example.test', password: 'admin-test123' },
  });
  assert.equal(adminLogin.response.status, 200);
  const adminToken = adminLogin.payload.token;

  const createdResponder = await request('/api/users', {
    method: 'POST',
    token: adminToken,
    body: {
      name: 'Test Other Responder',
      email: 'other-responder@example.test',
      password: 'responder-test123',
      role: 'responder',
      responder_type: 'other',
      unit: 'Test Rescue Unit',
    },
  });
  assert.equal(createdResponder.response.status, 201);
  assert.equal(createdResponder.payload.user.role, 'responder');

  const otherResponders = await request('/api/users/responders?type=other', {
    token: dispatcherToken,
  });
  assert.equal(otherResponders.response.status, 200);
  assert.equal(otherResponders.payload.length, 1);
  assert.equal(otherResponders.payload[0].responder_type, 'other');

  const responderLogin = await request('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'responder@example.test',
      password: 'responder-test123',
    },
  });
  assert.equal(responderLogin.response.status, 200);
  const responderToken = responderLogin.payload.token;
  const responderId = 3;

  const deniedVerify = await request('/api/incidents/41/verify', {
    method: 'PATCH',
    token: citizenToken,
    body: { valid: true },
  });
  assert.equal(deniedVerify.response.status, 403);

  const report = await request('/api/incidents', {
    method: 'POST',
    token: citizenToken,
    body: {
      type: 'Accident',
      location: 'Kigali',
      latitude: -1.95,
      longitude: 30.06,
      description: 'Vehicle collision',
    },
  });
  assert.equal(report.response.status, 201);
  assert.equal(report.payload.incident.id, 41);
  assert.equal(report.payload.incident.status, 'Reported');
  const dispatcherNotifications = await request('/api/notifications', {
    token: dispatcherToken,
  });
  assert.equal(dispatcherNotifications.response.status, 200);
  assert.equal(dispatcherNotifications.payload.unread_count, 1);
  assert.match(dispatcherNotifications.payload.notifications[0].message, /new accident incident #41/i);

  const dispatcherNotificationId = dispatcherNotifications.payload.notifications[0].id;
  const readDispatcherNotification = await request(
    `/api/notifications/${dispatcherNotificationId}/read`,
    { method: 'PATCH', token: dispatcherToken }
  );
  assert.equal(readDispatcherNotification.response.status, 200);
  const wrongOwnerRead = await request(
    `/api/notifications/${dispatcherNotificationId}/read`,
    { method: 'PATCH', token: citizenToken }
  );
  assert.equal(wrongOwnerRead.response.status, 404);

  const citizenIncidents = await request('/api/incidents', { token: citizenToken });
  assert.equal(citizenIncidents.response.status, 200);
  assert.equal(citizenIncidents.payload.length, 1);
  assert.equal(citizenIncidents.payload[0].citizen_id, 100);

  const responders = await request('/api/users/responders?type=medical&status=available', {
    token: dispatcherToken,
  });
  assert.equal(responders.response.status, 200);
  assert.equal(responders.payload.length, 1);
  assert.equal(responders.payload[0].responder_type, 'medical');

  const verified = await request('/api/incidents/41/verify', {
    method: 'PATCH',
    token: dispatcherToken,
    body: { valid: true },
  });
  assert.equal(verified.response.status, 200);
  assert.equal(verified.payload.incident.status, 'Verified');
  const citizenVerifiedNotice = await request('/api/notifications', {
    token: citizenToken,
  });
  assert.equal(citizenVerifiedNotice.response.status, 200);
  assert.equal(citizenVerifiedNotice.payload.unread_count, 1);
  assert.match(citizenVerifiedNotice.payload.notifications[0].message, /verified/i);

  const assigned = await request('/api/incidents/41/assign', {
    method: 'PATCH',
    token: dispatcherToken,
    body: { responder_id: 9 },
  });
  assert.equal(assigned.response.status, 200);
  assert.equal(assigned.payload.incident.status, 'Assigned');
  assert.equal(state.responders[0].status, 'busy');
  const responderAssignmentNotice = await request('/api/notifications', {
    token: responderToken,
  });
  assert.equal(responderAssignmentNotice.response.status, 200);
  assert.equal(responderAssignmentNotice.payload.unread_count, 1);
  assert.match(responderAssignmentNotice.payload.notifications[0].message, /assigned to you/i);
  assert.equal(
    state.notifications.filter((notification) => notification.user_id === citizenId).length,
    2
  );
  assert.equal(
    state.notifications.filter((notification) => notification.user_id === responderId).length,
    1
  );

  const responderIncidents = await request('/api/incidents', { token: responderToken });
  assert.equal(responderIncidents.response.status, 200);
  assert.equal(responderIncidents.payload.length, 1);
  assert.equal(responderIncidents.payload[0].responder_id, 9);

  const inProgress = await request('/api/incidents/41/status', {
    method: 'PATCH',
    token: responderToken,
    body: { status: 'In Progress', note: 'Responder accepted the assignment' },
  });
  assert.equal(inProgress.response.status, 200);
  assert.equal(inProgress.payload.incident.status, 'In Progress');

  const completed = await request('/api/incidents/41/status', {
    method: 'PATCH',
    token: responderToken,
    body: { status: 'Completed', note: 'Resolved during API test' },
  });
  assert.equal(completed.response.status, 200, JSON.stringify(completed.payload));
  assert.equal(completed.payload.incident.status, 'Completed');
  assert.equal(state.responders[0].status, 'available');

  const closed = await request('/api/incidents/41/close', {
    method: 'PATCH',
    token: dispatcherToken,
    body: {},
  });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.payload.incident.status, 'Closed');
  assert.deepEqual(
    state.history.map((entry) => entry.status),
    ['Reported', 'Verified', 'Assigned', 'In Progress', 'Completed', 'Closed']
  );
  const readAll = await request('/api/notifications/read-all', {
    method: 'PATCH',
    token: citizenToken,
  });
  assert.equal(readAll.response.status, 200);
  assert.equal(readAll.payload.updated, 5);
  const citizenNotifications = await request('/api/notifications', {
    token: citizenToken,
  });
  assert.equal(citizenNotifications.payload.unread_count, 0);

  const badFilter = await request('/api/incidents?status=unknown', {
    token: dispatcherToken,
  });
  assert.equal(badFilter.response.status, 400);

  const notFound = await request('/api/not-a-route');
  assert.equal(notFound.response.status, 404);
  assert.deepEqual(notFound.payload, { message: 'Route not found' });
});
