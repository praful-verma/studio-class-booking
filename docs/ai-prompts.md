# AI Prompt Log

## Step 1: Project Initialization

### Prompt

> Set up the initial Class Booking project using React + Vite, Node.js + Express and MongoDB + Mongoose.
>
> Create the client, server and docs folders, set up the required backend dependencies and basic backend structure. Add the MongoDB connection using `MONGODB_URI`, `.env.example`, CORS, JSON parsing, `/api/health` and the required npm scripts.
>
> Keep the frontend simple for now and don't implement any booking features yet.

### Result

AI helped me create the initial project structure and basic frontend/backend setup.

### My Review

I checked the folder structure, dependencies, environment variables and health endpoint. I also made small corrections where needed.

---

## Step 2: Database Models

### Prompt

> Read the README and existing schema documentation. Help me design the Mongoose models for users, members, classes, rooms, sessions, bookings and booking histories.
>
> Update `docs/schema.md` with the fields, relationships, indexes and important constraints. Create the corresponding Mongoose model files without implementing the application logic yet.

### Result

The required models and schema documentation were created.

### My Review

I went through the models and checked the relationships, indexes and constraints against the assignment requirements.

One design issue was identified during review: the member model initially included a separate membership status field such as `ACTIVE` or `EXPIRED`. I decided this was unnecessary because membership validity can be derived directly from `membershipExpiry`.

### Correction

I removed the separate membership status field and made `membershipExpiry` the source of truth for membership validity.

---

## Step 3: Authentication and Authorization

### Prompt

> Implement authentication and role-based authorization for the existing Class Booking backend.
>
> Use `bcryptjs` and `jsonwebtoken`. Add login, JWT verification, `/api/auth/me` and reusable role middleware for STAFF and INSTRUCTOR.
>
> STAFF should have full management access, while INSTRUCTOR access must be restricted to their assigned sessions. Keep authorization on the server side.

### Result

AI helped me add the authentication flow, JWT middleware and role-based authorization.

### My Review

I checked the login flow, JWT handling and role restrictions and tested protected routes. I also updated the environment configuration and architecture documentation.

### Correction

The initial implementation used a fallback JWT secret in the authentication code. I considered this unsafe because production authentication should depend on an explicitly configured environment variable.

I removed the fallback and made the JWT secret configuration mandatory.

---

## Step 4: Class and Member Management

### Prompt

> Implement the Class and Member management APIs using the existing models and authentication middleware.
>
> Add class create, update, archive and restore operations. Only STAFF should be able to modify classes.
>
> Add member create, list, view and update operations. Normalize member emails and prevent duplicate emails.
>
> Keep controllers thin and put the main logic in services.

### Result

AI helped me implement the class and member routes, controllers and services.

### My Review

I checked the CRUD operations, role restrictions, archived class behaviour, email validation and duplicate member handling.

I also verified that instructors should not have access to the member directory because the assignment only gives them access to sessions and bookings for sessions they are assigned to.

---

## Step 5: Rooms and Session Scheduling

### Prompt

> Implement room management and session scheduling for the Class Booking project.
>
> STAFF should manage rooms and sessions. Sessions should support primary and co-instructors, room assignment, duration and capacity.
>
> Add server-side instructor visibility and prevent overlapping sessions for rooms and instructors. Cancelled sessions should not block a time slot, and back-to-back sessions should be allowed.

### Result

AI helped me implement the room and session APIs and the scheduling validation.

### My Review

I tested room CRUD, session creation, default duration/capacity, instructor assignment and the different overlap cases. I also checked that instructors cannot access unrelated sessions.

I specifically verified that the overlap rule allows back-to-back sessions and that cancelled sessions do not continue blocking rooms or instructors.

---

## Step 6: Booking Lifecycle

### Prompt

> Implement the complete booking lifecycle according to the README.
>
> Add booking creation, duplicate prevention, membership expiry validation, capacity handling and waitlisting.
>
> Add cancellation with automatic promotion of the earliest waitlisted member. Add attendance handling after the session start time.
>
> Use a centralized booking status transition system and keep booking history immutable. Make the capacity check safe for concurrent booking requests.
>
> Add the required booking endpoints and tests.

### Result

AI helped me implement the booking services, controllers, routes and booking state handling.

### My Review

I tested the main booking scenarios including booking, waitlisting, duplicate bookings, expired memberships, cancellation, waitlist promotion and attendance. I also checked the booking history and concurrency handling.

### Correction

During review, I made sure the booking state transitions were centralized rather than allowing individual controllers to directly change booking statuses.

The final transition rules were:

| Current Status | Allowed Status               |
| -------------- | ---------------------------- |
| NONE           | BOOKED, WAITLISTED           |
| BOOKED         | CANCELLED, ATTENDED, NO_SHOW |
| WAITLISTED     | CANCELLED, BOOKED            |
| CANCELLED      | None                         |
| ATTENDED       | None                         |
| NO_SHOW        | None                         |

I also verified that cancellation and automatic waitlist promotion happen within the same transaction so the operation remains consistent.

---

## Step 7: Booking Search, Filtering, Sorting and CSV Export

### Prompt

> Add the booking list API with server-side search, filtering, sorting and pagination.
>
> Search should support member name/email and filters should support class, session and booking status.
>
> Add safe sorting and make sure instructors can only see bookings for their assigned sessions.
>
> Also add an attendance CSV export endpoint for sessions. STAFF can export any session and INSTRUCTOR can export only assigned sessions.
>
> Keep the filtering and pagination at the database/server level and add tests for the main cases.

### Result

AI helped me implement the booking search/filter API and attendance CSV export.

### My Review

I reviewed the query logic and made sure sorting only accepts allowed fields. I also checked instructor restrictions, pagination and CSV escaping for names/emails containing commas, quotes or line breaks.

I ran the booking tests again after this step to make sure the existing booking flow was still working.

---

## Step 8: Recurring Session Generation

### Prompt

> Implement Step 8: Recurring Session Generation.
>
> Create a STAFF-only endpoint under `/api/sessions` for bulk-generating sessions across a date range.
>
> Support classId, startDate, endDate, weekly pattern (days of the week), startTime, primaryInstructor, room, optional duration, and optional capacity.
>
> Reuse existing room/instructor overlap logic and class defaults. Skip conflicting or duplicate occurrences with clear reasons instead of aborting the operation. Return a summary with created and skipped counts and session details.
>
> Add automated tests covering pattern date generation, boundary dates, overrides, conflict skipping, duplicate submission protection, and role permissions.

### Result

AI helped me implement `generateRecurringSessions` in `sessionService.js`, added controller/routes under `POST /api/sessions/recurring`, and created the automated test suite `server/src/tests/testStep8RecurringSessions.js`.

### My Review

I verified that recurring session generation reuses existing `checkSchedulingConflicts` and `validateInstructors` logic without duplicating code. I checked that conflict occurrences are safely skipped without corrupting valid session entries or aborting the batch, and confirmed duplicate request resubmission skips existing dates cleanly. All tests passed.

---

## Step 9: Dashboard and Membership Expiry Alerts

### Prompt

> Implement Step 9: Dashboard and Membership Expiry Alerts.
>
> Create a STAFF-accessible dashboard API (`GET /api/dashboard`) returning sessions today, bookings today, no-shows this week, current waitlisted members, bookings by status, bookings by class, and attendance per week for the last 8 weeks.
>
> Calculate all dashboard metrics server-side using MongoDB queries/aggregations without fetching all records into memory.
>
> Create a STAFF-only membership expiry alerts API (`GET /api/membership-alerts`, `GET /api/membership-alerts/count`, `PATCH /api/membership-alerts/:memberId/dismiss`). Return members whose membership has expired or will expire within 7 days (inclusive).
>
> Support dismissal without modifying `membershipExpiry`, and ensure that if member's expiry is updated later, the alert reappears when appropriate.
>
> Add automated tests for dashboard metrics, alert boundaries, badge count, dismissal tracking, alert reappearance, and STAFF/INSTRUCTOR role restrictions (`403`).

### Result

AI helped me implement `dashboardService.js`, `alertService.js`, controllers, routes, `Member.js` schema extension (`dismissedExpiryDate`), and the automated test suite `server/src/tests/testStep9DashboardAlerts.js`.

### My Review

I checked that all dashboard metrics and 8-week attendance trends are computed server-side using MongoDB aggregation pipelines. I verified that membership alert dismissal sets `dismissedExpiryDate` without altering `membershipExpiry`, and tested that updating a member's expiry date allows the alert to reappear when entering the 7-day window. All tests passed cleanly.

---

## Step 10: Frontend Integration

### Prompt

> Implement Step 10, Phase 1: Frontend integration for the Class Booking application.
>
> Connect the backend functionality to a clean React/Vite frontend.
>
> Implement authentication (login, secure token storage, `/api/auth/me` verification, logout, role-based navigation), layout with alert badge count, and STAFF/INSTRUCTOR role workflows for Dashboard, Classes, Members, Rooms, Sessions, Bookings, Recurring Sessions, Membership Alerts, and Attendance CSV export.
>
> Maintain clean API handling and rely strictly on the backend as the source of truth for authorization, capacity, waitlists, and scheduling rules.

### Result

AI helped me create the API client layer (`client.js`, API modules), `AuthContext`, `ProtectedRoute`, `Layout`, `Modal`, `Pagination`, `StatusPill`, and all page components (`Login`, `Dashboard`, `Classes`, `Members`, `Rooms`, `Sessions`, `Bookings`, `RecurringSessions`, `MembershipAlerts`).

### My Review

I verified that the frontend compiles cleanly via `vite build` with zero errors. I tested role-based routing (`STAFF` vs `INSTRUCTOR`), form submissions, search/filter/sort pagination, modal dialogs, attendance CSV downloading, and alert dismissal badge updating.

### Correction: Instructor Lookup Endpoint

During browser testing, the primary instructor dropdown was empty even though the backend session functionality was working.

I traced the issue to the frontend requesting:

`GET /api/users?role=INSTRUCTOR`

but the backend did not yet expose that endpoint. The frontend was therefore receiving a 404 and showing an empty instructor list.

I added a protected `GET /api/users?role=INSTRUCTOR` endpoint that returns only active instructors and safe fields (`_id`, `name`, `email`, `role`). Password hashes and other sensitive fields are not returned.

After the correction, I re-tested session creation and recurring session generation successfully.

---

## General Note

I used AI mainly as a coding assistant during the implementation. I reviewed the generated code, compared it with the README requirements, made corrections where necessary, and tested the important flows myself.

I did not treat generated code as automatically correct. I verified the implementation through backend tests, frontend builds, browser testing and manual review of authorization and business rules.

When AI output conflicted with the assignment requirements or project design, I corrected the implementation rather than accepting the generated output unchanged.
