# Project Plan & Implementation Progress

This document describes the development plan for the **Class Booking** application and tracks the implementation progress of each major part of the assignment.

## Progress Summary

| Step    | Feature                                                     | Status    |
| ------- | ----------------------------------------------------------- | --------- |
| Step 1  | Project Initialization                                      | Completed |
| Step 2  | Database Schema & Models                                    | Completed |
| Step 3  | Authentication & Authorization                              | Completed |
| Step 4  | Class & Member Management                                   | Completed |
| Step 5  | Rooms & Session Scheduling                                  | Completed |
| Step 6  | Booking Lifecycle                                           | Completed |
| Step 7  | Booking Search, Filtering, Sorting, Pagination & CSV Export | Completed |
| Step 8  | Recurring Session Generation                                | Completed |
| Step 9  | Dashboard & Membership Expiry Alerts                        | Pending   |
| Step 10 | Frontend Integration, Testing, Documentation & Deployment   | Pending   |

---

## Step 1: Project Initialization

Set up the basic project structure and development environment.

### Planned Work

* React + Vite frontend
* Node.js + Express backend
* MongoDB + Mongoose
* Basic backend folder structure
* Environment variable setup
* CORS and JSON parsing
* Basic `/api/health` endpoint

### Status

**Completed**

The initial client and server applications are running and the project is ready for feature development.

---

## Step 2: Database Schema & Models

Create the database models required by the application before implementing the main business logic.

### Planned Work

* User
* Member
* Class
* Room
* Session
* Booking
* BookingHistory
* Relationships between the models
* Required indexes and constraints

### Status

**Completed**

The Mongoose models and database design were added and documented in `docs/schema.md`.

---

## Step 3: Authentication & Authorization

Add login and server-side role-based access control.

### Planned Work

* Password hashing
* JWT authentication
* Login endpoint
* Authentication middleware
* Role middleware
* STAFF and INSTRUCTOR permissions
* Protected `/api/auth/me` endpoint

### Status

**Completed**

Authentication and role-based authorization are implemented. Access restrictions are enforced on the backend rather than relying on the frontend.

---

## Step 4: Class & Member Management

Implement the basic management operations required for classes and members.

### Planned Work

* Create, view and update classes
* Archive and restore classes
* Create and update members
* Member email validation and duplicate prevention
* STAFF-only management operations

### Status

**Completed**

Class and member management APIs are implemented with the required validation and role restrictions.

---

## Step 5: Rooms & Session Scheduling

Implement rooms and the scheduling system.

### Planned Work

* Room management
* Session creation and updates
* Primary and co-instructor assignment
* Class default duration and capacity
* Instructor-specific session visibility
* Room overlap prevention
* Instructor overlap prevention
* Session cancellation

### Status

**Completed**

Room and session scheduling are implemented, including the required overlap checks and instructor access restrictions.

---

## Step 6: Booking Lifecycle

Implement the main booking workflow.

### Planned Work

* Create bookings
* Check membership expiry
* Prevent duplicate bookings
* Handle session capacity
* Add waitlisting
* Cancel bookings
* Automatically promote waitlisted members
* Record booking history
* Mark attendance
* Enforce valid booking status transitions
* Handle concurrent booking requests safely

### Status

**Completed**

The complete booking lifecycle is implemented, including booking, waitlisting, cancellation, promotion, attendance and booking history.

The main booking scenarios were tested after implementation to make sure the existing booking flow continued to work correctly.

---

## Step 7: Booking Search, Filtering, Sorting, Pagination & CSV Export

Add the tools needed to search and manage existing bookings efficiently.

### Planned Work

#### Booking List

Add `GET /api/bookings` with:

* Search by member name or email
* Filter by class
* Filter by session
* Filter by booking status
* Pagination
* Total result count
* Sorting by supported fields

#### Role-Based Visibility

* STAFF can view bookings across all sessions.
* INSTRUCTOR can only view bookings for sessions where they are assigned as the primary or co-instructor.

The restriction is applied on the server/database query.

#### Attendance CSV

Add:

`GET /api/sessions/:sessionId/attendance.csv`

The export includes:

* Member name
* Member email
* Booking status
* Booking creation time

STAFF can export any session, while INSTRUCTOR access is limited to assigned sessions.

### Status

**Completed**

The search, filtering, pagination, sorting and instructor visibility behaviour were tested. Attendance CSV export was also tested, including CSV escaping for special characters.

Existing booking lifecycle tests were run again after these changes.

---

## Step 8: Recurring Session Generation

Add the staff workflow for generating sessions from a weekly schedule across a date range.

### Planned Work

* Select a class
* Select primary instructor and room
* Set date range (`startDate`, `endDate`)
* Define weekly schedule pattern (e.g. `['MONDAY', 'WEDNESDAY']`)
* Generate sessions for matching days
* Use class duration and capacity defaults unless overridden
* Reuse existing room and instructor overlap checks
* Skip conflicting sessions instead of creating invalid sessions
* Report how many sessions were created
* Report which sessions were skipped and why
* Prevent duplicate session generation on resubmission
* Restrict endpoint access to STAFF (`403` for INSTRUCTOR)

### Status

**Completed**

Implemented endpoint `POST /api/sessions/recurring` with server-side role validation, date iteration, fallback defaults, duplicate checking, and overlap skipping.

Verified via automated test suite `server/src/tests/testStep8RecurringSessions.js` covering date range matching, duration/capacity overrides, room conflict skipping, instructor conflict skipping, duplicate submission skipping, archived resource rejection, and STAFF vs INSTRUCTOR permissions.

---

## Step 9: Dashboard & Membership Expiry Alerts

Add the remaining operational information required by the assignment.

### Planned Work

#### Dashboard

Show:

* Sessions today
* Bookings today
* No-shows this week
* Members currently waitlisted
* Bookings by status
* Bookings by class
* Attendance per week for the last 8 weeks

#### Membership Expiry Alerts

Show members whose membership:

* Has already expired, or
* Will expire within the next 7 days

Add:

* Alerts area
* Navigation badge/count
* Staff dismissal
* Alert returning when a newly updated expiry date later falls within the 7-day window

### Status

**Pending**

The dashboard and alert logic will be implemented using server-side queries so that the frontend does not need to calculate these values from large datasets.

---

## Step 10: Frontend Integration, Testing, Documentation & Deployment

Connect the completed backend functionality to the frontend and prepare the project for submission.

### Planned Work

#### Frontend

* Login and authentication state
* Role-based navigation
* Dashboard
* Classes
* Members
* Rooms
* Sessions
* Co-instructor management
* Booking management
* Booking search and filters
* Booking history
* Attendance management
* Recurring session generation
* Expiry alerts
* CSV export

The UI will focus on making the required workflows clear and usable rather than adding unnecessary features.

#### Final Testing

Test the complete application from the frontend and API level.

Check:

* STAFF permissions
* INSTRUCTOR permissions
* Booking lifecycle
* Waitlist promotion
* Scheduling conflicts
* Recurring sessions
* Search and pagination
* CSV export
* Dashboard calculations
* Expiry alerts
* Invalid requests and server-side authorization

#### Documentation

Review and complete:

* `README.md`
* `docs/architecture.md`
* `docs/schema.md`
* `docs/plan.md`
* `docs/decisions.md`
* `docs/ai-prompts.md`

The documentation will describe the actual implementation and decisions made during development.

#### Deployment

* Configure production environment variables
* Deploy frontend
* Deploy backend
* Connect production MongoDB
* Add demo data
* Add demo credentials
* Verify the deployed application
* Remove or disable development-only endpoints and test data

### Status

**Pending**

---

## Current Project Status

The core backend functionality through Step 7 has been implemented.

The project currently includes:

* Authentication and authorization
* Class and member management
* Room and session scheduling
* Primary and co-instructor assignment
* Room and instructor overlap prevention
* Booking and waitlist management
* Attendance handling
* Immutable booking history
* Booking search and filtering
* Sorting and pagination
* Attendance CSV export
* Server-side role-based access control

The remaining work is focused on recurring sessions, dashboard and expiry alerts, frontend integration, final testing, documentation review and deployment.

The implementation is being kept focused on the assignment requirements, with optional features being avoided until the required functionality is complete.
