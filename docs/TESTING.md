# RERCS testing

## Run automated tests

From `backend`:

```powershell
npm test
```

The backend tests use Node's built-in test runner and stub database access. The
REST suite starts the real Express app on a temporary local port and sends HTTP
requests to its routes, middleware, and controllers. Neither suite reads,
writes, nor deletes application records in the configured database.

The REST API suite runs a citizen-to-dispatcher-to-responder workflow and checks
JSON status/body responses, bearer-token authentication, role restrictions,
query filters, malformed JSON, invalid status values, and unknown routes.

Run the frontend checks from the repository root:

```powershell
npm.cmd run build --prefix frontend
npm.cmd run lint --prefix frontend
```

## Automated coverage

The tests exercise the implemented portions of these SRS requirements:

| SRS requirement | Automated checks |
| --- | --- |
| REQ-3, BR-3 | Responder creation path and invalid responder type validation |
| REQ-4 | Password is hashed at registration; successful and unsuccessful login |
| REQ-6, BR-1 | Role middleware denies unauthorized actions |
| REQ-8 | Registration rejects invalid email |
| REQ-11, REQ-17 | Incident location validation and report creation |
| REQ-19 | Dispatcher verifies and rejects assignment until verification |
| REQ-21, REQ-22 | Responder filtering and compatible, available responder assignment |
| REQ-25, BR-4 | Incident status changes create history entries |
| REQ-34, BR-2 | Assigned responder completes work and is made available again |
| BR-5 | Only completed incidents can be closed |
| REQ-41 (in-app portion) | Dispatchers, responders, and citizens receive event notifications; owners can mark them read |

These are controller-level tests with database stubs, not tests against a
production or staging database.

The suite also includes HTTP-level REST API coverage in `backend/test/api.test.js`.
That suite exercises `/api/auth/register`, `/api/auth/login`, `/api/auth/me`,
`/api/incidents`, incident verification/assignment/status/closure endpoints,
`/api/users` staff creation, `/api/users/responders`, and `/api/notifications`
including read ownership and mark-all-read. Database access is stubbed so no
real incident or user records are touched.

## Manual acceptance checks

Use a non-production database with one citizen, dispatcher, and available
responders of types police, medical, fire, and other.

1. Register a citizen and confirm duplicate or invalid registration shows an
   error without creating another account.
2. Log in with correct and incorrect credentials; confirm each role sees only
   its authorized pages and actions.
3. Submit an incident with a valid location; confirm it appears in the
   dispatcher queue and has a history entry.
4. Verify an incident, choose a compatible available responder, and assign it.
   Confirm the incident becomes Assigned and the responder becomes busy.
5. Try an incompatible or busy responder and confirm assignment is rejected
   without changing the incident.
6. Log in as the assigned responder, update progress, complete the work, and
   confirm the responder becomes available.
7. Close a completed incident and confirm it cannot be closed before completion.

## SRS items not verified by this suite

The supplied SRS describes features beyond the current application and these
tests. Review these gaps before claiming full SRS compliance:

- Account verification codes, failed-login lockout, password reset, and
  15-minute staff inactivity timeout (REQ-1, REQ-4, REQ-5, REQ-7).
- The SRS password rule requires at least eight characters with letters and
  numbers; current registration and staff-account validation accepts passwords
  from six characters and does not enforce that composition rule (Section 5.3).
- Guest reports, photo uploads, deduplication, phone-call source, configurable
  incident categories, and incident reference numbers (REQ-2, REQ-9, REQ-12,
  REQ-13, REQ-15, REQ-16, REQ-20).
- Priority, nearest-unit distance, multiple agencies per incident, reassignment
  and cancellation with reasons (REQ-18, REQ-19, REQ-21, REQ-22, REQ-24).
- Live maps, push updates, responder notifications and precise arrival statuses
  (REQ-26 through REQ-34).
- E-mail and SMS notification delivery, preferences, delivery logs and failure
  handling (REQ-41, REQ-44, REQ-45); only in-app notifications are implemented.
- Notes/photos, citizen tracking, alerts, analytics/exports, audit log,
  user-disable workflow, backup/recovery, and localization (REQ-35 through
  REQ-55 and Section 6).
- Performance targets, 500 concurrent users, 100 submissions per minute,
  availability, and 3G page-load targets (Section 5). These require a prepared
  staging environment and dedicated load/operational testing; they are not
  measured by the automated suite.
