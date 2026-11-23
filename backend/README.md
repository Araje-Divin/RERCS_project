# RERCS backend

## Configuration

Create a `backend/.env` file with either a PostgreSQL connection URL:

```env
DATABASE_URL=postgresql://user:password@host:5432/rercs_db
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Or configure a local database with `DB_HOST`, `DB_PORT`, `DB_USER`,
`DB_PASSWORD`, and `DB_NAME` instead of `DATABASE_URL`. `JWT_SECRET` is
required to start the API. Keep `.env` private and do not commit real secrets.

## Run

From the `backend` directory:

```powershell
npm install
npm run dev
```

Open `http://localhost:5000/api-docs` to browse and try all REST endpoints.
The OpenAPI JSON is available at `http://localhost:5000/api-docs.json`.
Use the Swagger UI **Authorize** button with a bearer token from `/api/auth/login`
for protected endpoints.

Initialize the database with `database/schema.sql` before starting the API.
For an existing database, apply `database/migrations/20261117_add_other_responder_type.sql`
to allow the new `other` responder type.
Apply `database/migrations/20261117_add_in_app_notifications.sql` to enable
in-app notifications for existing installations. Notifications appear in the
navigation bar and are created for dispatchers when an incident is reported,
responders when assigned, and citizens as their incident changes status.
To create the sample admin, dispatcher, and responder accounts, set a private
`SEED_PASSWORD` of 12-72 bytes in `.env`, then run `npm run seed`. The seed
command uses that password for all three sample accounts.
