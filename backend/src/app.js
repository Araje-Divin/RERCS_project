// Sets up Express: middleware and routes.
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const openapiSpec = require('./docs/openapi');

const app = express();

app.use(cors());          // lets the React app call this server
app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
  res.json({ message: 'RERCS API is running' });
});

app.get('/api-docs.json', (req, res) => {
  res.json(openapiSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/notifications', notificationRoutes);

// If no route matched
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large' });
  }
  if (err instanceof SyntaxError && Object.hasOwn(err, 'body')) {
    return res.status(400).json({ message: 'Request body must be valid JSON' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Server error' });
});

module.exports = app;
