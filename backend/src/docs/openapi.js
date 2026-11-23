module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'RERCS REST API',
    version: '1.0.0',
    description:
      'API documentation for the Rwanda Emergency Response Coordinating System. Use the Authorize button to provide a bearer token from /api/auth/login.',
  },
  servers: [
    {
      url: '/',
      description: 'Current API server',
    },
  ],
  tags: [
    { name: 'Health', description: 'API availability' },
    { name: 'Authentication', description: 'Registration and login' },
    { name: 'Incidents', description: 'Emergency report workflow' },
    { name: 'Users', description: 'Admin user management and responder lookup' },
    { name: 'Notifications', description: 'Personal in-app notifications' },
  ],
  paths: {
    '/': {
      get: {
        tags: ['Health'],
        summary: 'Check whether the API is running',
        responses: {
          200: {
            description: 'API is running',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string', example: 'RERCS API is running' } },
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a citizen account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', maxLength: 100 },
                  email: { type: 'string', format: 'email', maxLength: 150 },
                  phone: { type: 'string', maxLength: 20 },
                  address: { type: 'string', maxLength: 255 },
                  password: { type: 'string', minLength: 6, maxLength: 72 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Citizen account created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Log in and receive a JWT bearer token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    maxLength: 150,
                    description: 'Email address or supported email-like username.',
                    example: 'dispatcher@example.com',
                  },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get the current authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents': {
      get: {
        tags: ['Incidents'],
        summary: 'List incidents visible to the authenticated user',
        description: 'Citizens see their own incidents; responders see their assignments; dispatchers and admins see all.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { $ref: '#/components/schemas/IncidentStatus' },
          },
        ],
        responses: {
          200: {
            description: 'Incident list',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Incident' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Incidents'],
        summary: 'Create an incident as a citizen',
        security: [{ bearerAuth: [] }],
        description: 'Citizen role required. A notification is sent to dispatchers.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['type', 'location', 'description'],
                properties: {
                  type: { $ref: '#/components/schemas/IncidentType' },
                  location: { type: 'string', minLength: 1, maxLength: 255 },
                  latitude: { type: 'number', minimum: -90, maximum: 90, nullable: true },
                  longitude: { type: 'number', minimum: -180, maximum: 180, nullable: true },
                  description: { type: 'string', minLength: 1, maxLength: 5000 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Incident created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    incident: { $ref: '#/components/schemas/Incident' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/incidents/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Incidents'],
        summary: 'Get an incident',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Incident details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Incident' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents/{id}/history': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Incidents'],
        summary: 'Get incident status history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Chronological history entries',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      status: { $ref: '#/components/schemas/IncidentStatus' },
                      note: { type: 'string', nullable: true },
                      created_at: { type: 'string', format: 'date-time' },
                      updated_by_name: { type: 'string', nullable: true },
                    },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents/{id}/verify': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      patch: {
        tags: ['Incidents'],
        summary: 'Verify or reject a reported incident',
        description: 'Dispatcher role required. Notifies the citizen.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['valid'],
                properties: {
                  valid: { type: 'boolean' },
                  note: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/IncidentAction' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents/{id}/assign': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      patch: {
        tags: ['Incidents'],
        summary: 'Assign an available, compatible responder',
        description: 'Dispatcher role required. Incident must be Verified. The responder is marked busy, and both responder and citizen are notified.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['responder_id'],
                properties: { responder_id: { type: 'integer', minimum: 1 } },
              },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/IncidentAction' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents/{id}/status': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      patch: {
        tags: ['Incidents'],
        summary: 'Update an assigned incident status',
        description: 'Responder role required; only the responder assigned to this incident can update it.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: { type: 'string', enum: ['In Progress', 'Pending', 'Completed'] },
                  note: { type: 'string', maxLength: 1000 },
                },
              },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/IncidentAction' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/incidents/{id}/close': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      patch: {
        tags: ['Incidents'],
        summary: 'Close a completed incident',
        description: 'Dispatcher role required. Only Completed incidents can be closed.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { note: { type: 'string', maxLength: 1000 } },
              },
            },
          },
        },
        responses: {
          200: { $ref: '#/components/responses/IncidentAction' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        description: 'Admin role required.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Users',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/User' } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create a dispatcher, responder, or admin account',
        description: 'Admin role required. Citizen registration uses /api/auth/register.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', maxLength: 100 },
                  email: { type: 'string', format: 'email', maxLength: 150 },
                  phone: { type: 'string', maxLength: 20 },
                  address: { type: 'string', maxLength: 255 },
                  password: { type: 'string', minLength: 6, maxLength: 72 },
                  role: { type: 'string', enum: ['dispatcher', 'responder', 'admin'] },
                  responder_type: { type: 'string', enum: ['police', 'medical', 'fire', 'other'] },
                  unit: { type: 'string', maxLength: 100 },
                  badge_number: { type: 'string', maxLength: 50 },
                  license_number: { type: 'string', maxLength: 50 },
                  station: { type: 'string', maxLength: 100 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/users/responders': {
      get: {
        tags: ['Users'],
        summary: 'List responders',
        description: 'Dispatcher or admin role required.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['police', 'medical', 'fire', 'other'] },
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['available', 'busy', 'offline'] },
          },
        ],
        responses: {
          200: {
            description: 'Responders',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Responder' } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/api/users/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      delete: {
        tags: ['Users'],
        summary: 'Delete a user',
        description: 'Admin role required. The current admin cannot delete their own account.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'User deleted',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' } } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          403: { $ref: '#/components/responses/Forbidden' },
          404: { $ref: '#/components/responses/NotFound' },
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List the current user’s latest notifications',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Up to 50 notifications and the unread count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                    unread_count: { type: 'integer' },
                  },
                },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all current-user notifications as read',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notifications marked read',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { updated: { type: 'integer' } } },
              },
            },
          },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/api/notifications/{id}/read': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one current-user notification as read',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Notification marked read',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { notification: { $ref: '#/components/schemas/NotificationRead' } },
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste the token returned by /api/auth/login.',
      },
    },
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'integer', minimum: 1 },
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['citizen', 'dispatcher', 'responder', 'admin'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string', description: 'Account email or login identifier.' },
              role: { type: 'string', enum: ['citizen', 'dispatcher', 'responder', 'admin'] },
            },
          },
        },
      },
      IncidentType: {
        type: 'string',
        enum: ['Fire', 'Medical', 'Accident', 'Crime', 'Natural Disaster', 'Other'],
      },
      IncidentStatus: {
        type: 'string',
        enum: ['Reported', 'Verified', 'Rejected', 'Assigned', 'In Progress', 'Pending', 'Completed', 'Closed'],
      },
      Incident: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          citizen_id: { type: 'integer' },
          type: { $ref: '#/components/schemas/IncidentType' },
          location: { type: 'string' },
          latitude: { type: 'number', nullable: true },
          longitude: { type: 'number', nullable: true },
          description: { type: 'string' },
          status: { $ref: '#/components/schemas/IncidentStatus' },
          dispatcher_id: { type: 'integer', nullable: true },
          responder_id: { type: 'integer', nullable: true },
          reported_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
          citizen_name: { type: 'string' },
          citizen_phone: { type: 'string', nullable: true },
          responder_type: { type: 'string', nullable: true },
          responder_name: { type: 'string', nullable: true },
        },
      },
      Responder: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          phone: { type: 'string', nullable: true },
          responder_type: { type: 'string', enum: ['police', 'medical', 'fire', 'other'] },
          unit: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['available', 'busy', 'offline'] },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          incident_id: { type: 'integer', nullable: true },
          type: { type: 'string' },
          message: { type: 'string' },
          read_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      NotificationRead: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          read_at: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      BadRequest: {
        description: 'Invalid request data',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Authentication required or token invalid',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Role not permitted',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Resource not found',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'Conflicting resource or linked records',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      IncidentAction: {
        description: 'Incident action completed',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                incident: { $ref: '#/components/schemas/Incident' },
              },
            },
          },
        },
      },
    },
  },
};
