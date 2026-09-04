# Studio Class Booking

A full-stack web application for managing fitness studio classes and bookings.

Staff can manage classes, members, rooms and sessions, while instructors can view the sessions they are assigned to. The application also handles bookings, waitlists, attendance, recurring sessions, membership expiry alerts and basic dashboard metrics.

## Features

* Staff and instructor login with role-based access
* Create, edit, archive and restore classes
* Add and manage studio members
* Track membership expiry dates
* Create, edit and archive rooms
* Schedule class sessions with:

  * Primary instructor
  * Co-instructors
  * Room
  * Duration
  * Capacity
* Prevent room and instructor scheduling conflicts
* Book members into sessions
* Automatically waitlist members when a session is full
* Prevent duplicate bookings
* Prevent expired members from making new bookings
* Automatically promote the earliest waitlisted member when a booked member cancels
* Mark bookings as `ATTENDED` or `NO_SHOW` after the session starts
* Keep an immutable booking history
* Search and filter bookings by member, class, session and status
* Sort and paginate bookings on the server
* Export session attendance as CSV
* Generate recurring sessions from a weekly schedule
* Report skipped recurring sessions when conflicts or duplicates are found
* Dashboard with booking, attendance and waitlist information
* Membership expiry alerts with dismissal support
* Alerts automatically become active again when a renewed membership enters the alert period

## Roles

### STAFF

Staff users can manage the studio and have access to all sessions and bookings.

They can:

* Manage classes
* Manage members
* Manage rooms
* Create and update sessions
* Assign instructors
* Create and cancel bookings
* Manage attendance
* Generate recurring sessions
* View and dismiss membership expiry alerts
* View dashboard metrics
* Export attendance

### INSTRUCTOR

Instructors have limited access to the sessions they are assigned to as either the primary instructor or a co-instructor.

They can:

* View their assigned sessions
* View bookings for their assigned sessions
* View booking history
* Export attendance for their assigned sessions

Instructor access to unrelated sessions and staff-only operations is rejected by the backend.

## Tech Stack

* React
* Vite
* React Router
* Node.js
* Express
* MongoDB
* Mongoose
* JWT
* bcryptjs
* CSS

## Project Structure

```text
studio-class-booking/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── tests/
│   │   ├── seed.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── schema.md
│   ├── plan.md
│   ├── decisions.md
│   └── ai-prompts.md
│
└── README.md
```

## Setup

### Prerequisites

You need:

* Node.js 18 or newer
* npm
* MongoDB

MongoDB should support transactions because booking cancellation and waitlist promotion use MongoDB transactions.

MongoDB Atlas can be used for this.

### 1. Clone the project

```bash
git clone <your-github-repository-url>
cd studio-class-booking
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Install frontend dependencies

```bash
cd ../client
npm install
```

### 4. Configure environment variables

Create `server/.env` using `server/.env.example`.

Example:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

Create `client/.env` using `client/.env.example`.

Example:

```env
VITE_API_URL=http://localhost:5000/api
```

Do not commit `.env` files or real secrets to GitHub.

## Demo Data

The backend includes a seed script for creating demo users.

From the `server` directory:

```bash
npm run seed
```

The demo accounts created by the seed script can be used to test the two application roles.

Check `server/src/seed.js` for the current demo credentials.

## Running the Application

### Start the backend

From the `server` directory:

```bash
npm run dev
```

The backend runs on the configured port, normally:

```text
http://localhost:5000
```

### Start the frontend

Open another terminal:

```bash
cd client
npm run dev
```

Vite will show the local frontend URL in the terminal.

```

## API

The backend exposes REST APIs for the main parts of the application.

Main API areas include:

```text
/api/auth
/api/users
/api/classes
/api/members
/api/rooms
/api/sessions
/api/bookings
/api/dashboard
/api/membership-alerts
```

Some important endpoints include:

```text
POST   /api/auth/login
GET    /api/auth/me

GET    /api/users?role=INSTRUCTOR

POST   /api/sessions/recurring

GET    /api/dashboard

GET    /api/membership-alerts
GET    /api/membership-alerts/count
PATCH  /api/membership-alerts/:memberId/dismiss

GET    /api/sessions/:id/attendance.csv
```

Authentication is handled using JWT bearer tokens.

## Server-Side Rules

The frontend is not treated as the source of truth for important business rules.

The backend checks:

* User roles and permissions
* Instructor access to sessions
* Room and instructor scheduling conflicts
* Session capacity
* Duplicate bookings
* Membership expiry
* Valid booking status transitions
* Attendance timing
* Waitlist promotion

Booking operations that change related records use MongoDB transactions where required.

## Booking Statuses

Bookings can have the following statuses:

```text
BOOKED
WAITLISTED
CANCELLED
ATTENDED
NO_SHOW
```

The booking lifecycle is controlled by server-side transition rules.

For example:

```text
BOOKED -> CANCELLED
BOOKED -> ATTENDED
BOOKED -> NO_SHOW

WAITLISTED -> CANCELLED
WAITLISTED -> BOOKED
```

Invalid transitions are rejected by the backend.

## Testing

The project contains automated backend tests for the main business rules.

From the `server` directory:

```bash
node src/tests/testBookingLifecycle.js
node src/tests/testStep7SearchExport.js
node src/tests/testStep8RecurringSessions.js
node src/tests/testStep9DashboardAlerts.js
node src/tests/testUsersEndpoint.js
```

These cover areas such as:

* Booking and waitlisting
* Duplicate booking prevention
* Membership expiry
* Waitlist promotion
* Attendance
* Booking history
* Search, filtering and pagination
* CSV export
* Recurring sessions
* Scheduling conflicts
* Dashboard metrics
* Membership expiry alerts
* Instructor lookup and permissions

The main STAFF and INSTRUCTOR workflows were also tested through the browser.

## Frontend Build

To create a production build:

```bash
cd client
npm run build
```

The build output is created in:

```text
client/dist/
```

## Documentation

More detailed project information is available in the `docs` folder:

* `architecture.md` — application architecture and API structure
* `schema.md` — MongoDB collections, relationships and indexes
* `plan.md` — implementation plan and progress
* `decisions.md` — important technical decisions and their reasoning
* `ai-prompts.md` — prompts used during development and review/correction notes

## Current Status

The main required application features have been implemented and tested.

Completed:

* Backend APIs
* Authentication and authorization
* Class, member and room management
* Session scheduling
* Booking and waitlist lifecycle
* Attendance handling
* Booking history
* Booking search and pagination
* Attendance CSV export
* Recurring session generation
* Dashboard
* Membership expiry alerts
* React/Vite frontend
* STAFF and INSTRUCTOR browser workflows

Remaining:

* Final documentation review
* Final regression verification
* Production deployment
* Deployed application verification
* Final submission preparation
