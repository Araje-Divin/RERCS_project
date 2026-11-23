
# Rwanda Emergency Response Coordinating System (RERCS)

**Student Name:** Araje Divin
**Student ID:** 26461

RERCS is a full-stack web application designed to help citizens report emergencies and support dispatchers and emergency responders in Rwanda to coordinate and track incident responses efficiently.



## 1. Introduction

The Rwanda Emergency Response Coordinating System (RERCS) is a centralized digital platform for emergency reporting and incident management. The system connects four main user groups:

- Citizens who report emergencies.
- Dispatchers who review and verify reports.
- Police, medical, fire and other responders who handle incidents.
- Administrators who manage system users and responders.

RERCS provides role-based dashboards, incident status tracking, responder assignment, notification messages and a complete history of incident updates.



## 2. Objective of the Project

The main objectives of RERCS are:

- To make emergency reporting simple and accessible.
- To give dispatchers a central place for reviewing incoming incidents.
- To assign the appropriate responder quickly and accurately.
- To allow responders to update the progress of assigned incidents.
- To maintain a clear and searchable incident status history.
- To improve communication between citizens, dispatchers and responders.
- To provide administrators with tools for managing users and responders.



## 3. Problem and Solution

### Problem

Traditional or disconnected emergency response processes can cause delayed reporting, poor communication, duplicate records and difficulty in tracking an incident after it has been reported.

Citizens may not know:

- Whether their report was received.
- Which responder is responsible for the incident.
- The current progress of the response.

Dispatchers may also face challenges in organizing reports and responders may have difficulty seeing the incidents assigned to them.

### Solution

RERCS solves these problems by providing one web-based system where:

1. A citizen submits an emergency report.
2. The dispatcher verifies or rejects the report.
3. The dispatcher assigns an available responder.
4. The responder starts and updates the response.
5. The citizen and relevant users receive status notifications.
6. Administrators monitor users, responders and incident statistics.

---

## 4. How the System Works

### Emergency Reporting Workflow

```text
Citizen registers/logs in
        |
        v
Citizen submits an emergency report
        |
        v
Dispatcher receives the report
        |
        v
Dispatcher verifies or rejects the report
        |
        v
Dispatcher assigns a responder
        |
        v
Responder starts and updates the incident
        |
        v
Incident is completed or closed
        |
        v
Status history and notifications are saved
```

### Supported Incident Statuses

| Status | Meaning |
| --- | --- |
| Reported | The citizen has submitted the incident |
| Verified | The dispatcher confirmed the report |
| Rejected | The dispatcher determined that the report should not proceed |
| Assigned | A responder has been selected |
| In Progress | The responder has started handling the incident |
| Pending | The incident requires further action |
| Completed | The responder has finished the response |
| Closed | The dispatcher or system process has closed the incident |

### System Screenshot

#### Login Page

The login page allows registered users to access the system according to their role.

![RERCS login page](img/Home.png)

#### Emergency Reporting by Citizen

Citizens enter the emergency type, location, GPS coordinates and a description of the incident.

![Citizen emergency reporting page](img/citizen.png)

#### Citizen Registration

New citizens create an account by providing their name, email, phone number, address and password.

![Citizen account registration page](img/create-citizen.png)

#### Citizen Incident History

Citizens can review their reported incidents, current status, location and response history.

![Citizen incident history page](img/citizen%20(2).png)

#### Dispatcher Dashboard

The dispatcher reviews reported incidents, verifies or rejects reports and assigns responders.

![Dispatcher dashboard](img/dispatcher.png)

#### Responder Dashboard

Responders view their active assignments and update the progress of incidents assigned to them.

![Responder dashboard](img/police%20page.png)

#### Medical Responder Dashboard

The medical responder dashboard shows closed and active medical assignments and supports responder-side incident tracking.

![Medical responder dashboard](img/medical%20page.png)

#### Fire Responder Dashboard

Fire responders can view active or completed fire incident assignments and the citizen contact and incident details.

![Fire responder dashboard](img/firefighter.png)

#### Administrator Dashboard

Administrators view incident statistics, manage users and monitor responder availability.

![Administrator dashboard](img/admin%20page.png)

#### Administrator Creating a New User

The administrator can create users for dispatcher and responder roles and assign account details and login credentials.

![Administrator creating a user](img/create-users.png)



## 5. Who Uses This Project

| User | Main Tasks |
| --- | --- |
| Citizen | Creates an account, logs in, reports emergencies and views personal incident records |
| Dispatcher | Reviews reports, verifies or rejects incidents and assigns available responders |
| Police Responder | Receives and responds to police-related or crime incidents |
| Medical Responder | Receives and responds to medical emergencies |
| Fire Responder | Receives and responds to fire-related incidents |
| Other Responder | Handles incident types assigned to general or specialized rescue units |
| Administrator | Creates and manages users, manages responders and monitors system activity |

---

## 6. Technologies Used to Build the Project

### Frontend

- React 19
- Vite 8
- React Router
- Axios
- HTML and CSS
- JavaScript

### Backend

- Node.js
- Express 5
- JSON Web Tokens (JWT)
- bcryptjs for password hashing
- CORS
- Swagger UI and OpenAPI

### Database

- PostgreSQL
- SQL schema and migration scripts

### Development and Testing

- npm
- Node.js test runner
- Mocked database test access
- Vite build and Oxlint checks

### Project Structure

```text
RERCS/
|-- backend/
|   |-- src/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- routes/
|   |   |-- docs/
|   |   `-- config/
|   |-- test/
|   |-- server.js
|   `-- seed.js
|-- frontend/
|   `-- src/
|       |-- components/
|       |-- context/
|       |-- pages/
|       `-- services/
|-- database/
|   |-- schema.sql
|   `-- migrations/
|-- docs/
|-- img/
`-- README.md
```

---

# Installation and Setup

## Prerequisites

- Node.js and npm
- PostgreSQL
- A modern web browser

## Database Setup

Create a PostgreSQL database named `rercs_db`, then run the SQL schema:

```powershell
psql -d rercs_db -f database/schema.sql
```

For an existing database, apply:

```text
database/migrations/20261117_add_other_responder_type.sql
database/migrations/20261117_add_in_app_notifications.sql
```

The following screenshot shows incident records stored in the PostgreSQL database using pgAdmin:

![RERCS incident records in PostgreSQL](img/database-incidents.png)

This pgAdmin view also shows the `rercs_db` database, its public schema and the incident records:

![RERCS PostgreSQL database and incident table in pgAdmin](img/database-pgadmin.png)

## Backend Configuration

Create `backend/.env` using one of the following database configurations.

### PostgreSQL Connection URL

```env
DATABASE_URL=postgresql://username:password@host:5432/rercs_db
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

### Separate Database Settings

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=rercs_db
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

## Run the Backend

```powershell
cd backend
npm install
npm run dev
```

The API runs at `http://localhost:5000` by default.

## Run the Frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL displayed by Vite, usually `http://localhost:5173`.

## API Documentation

With the backend running:

- Swagger UI: `http://localhost:5000/api-docs`
- OpenAPI JSON: `http://localhost:5000/api-docs.json`

Protected endpoints require a JWT bearer token obtained from the login endpoint.

The Swagger UI provides an interactive view of the API endpoints:

![RERCS Swagger API documentation](img/api-documentation.png)

The OpenAPI JSON endpoint provides the machine-readable API specification:

![RERCS OpenAPI JSON specification](img/openapi-json.png)

## Seed Accounts

Set a private seed password in `backend/.env`:

```env
SEED_PASSWORD=your-strong-seed-password
```

Then seed the database:

```powershell
cd backend
npm run seed
```

The seed script creates accounts for an administrator, dispatcher, police responder, medical responder, fire responder and other responder. Change all demonstration credentials before production deployment.

## Language Support

RERCS supports:

- English
- Kinyarwanda
- French
- Kiswahili

The selected language is stored in browser local storage.

## Testing

Run backend tests:

```powershell
cd backend
npm test
```

The backend test suite verifies authentication, role authorization, incident reporting, verification, responder assignment, status updates and notifications.

![RERCS backend test results](img/testing.png)

Build the frontend:

```powershell
# Run from the project root:
npm.cmd run build --prefix frontend

# Or, if the terminal is already inside the frontend directory:
cd frontend
npm.cmd run build


Run frontend lint checks:

```powershell
# Run from the project root:
npm.cmd run lint --prefix frontend

# Or, if the terminal is already inside the frontend directory:
cd frontend
npm.cmd run lint


![RERCS frontend build and lint testing](img/frontend-testing.png)

The frontend production build completes successfully. Frontend linting also runs successfully and may display React Fast Refresh or effect warnings; these warnings do not stop the build or prevent the application from running. The displayed warnings should be reviewed during later code-quality improvements.

Additional testing information is available in [docs/TESTING.md](docs/TESTING.md).



## 7. Conclusion

RERCS provides a practical digital solution for improving emergency incident reporting and response coordination in Rwanda. The project replaces manual or disconnected communication with a structured workflow that includes registration, incident submission, verification, responder assignment, progress updates and notifications.

By dividing responsibilities among citizens, dispatchers, responders and administrators, RERCS makes each role clear and helps all authorized users follow the current status of an incident. The system demonstrates how React, Node.js, Express and PostgreSQL can be combined to build a secure, role-based and maintainable emergency response platform.

Future development may include real-time maps, SMS and email alerts, mobile applications, public alert areas, official reports and exports, audit logging and automatic backups.

# RERCS_project
Rwanda Emergency Response Coordination System 

