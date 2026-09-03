# AI Prompt Log

## Step 1: Project Initialization

### Prompt
> Initialize the Class Booking project foundation using React + Vite for the frontend, Node.js + Express for the backend, and MongoDB + Mongoose for the database.
> Create client/, server/, and docs/ folders. Set up the Express backend with express, mongoose, cors, dotenv, and nodemon. Create the backend structure with config, controllers, middleware, models, routes, services, and utils.
> Add MongoDB connection using MONGODB_URI, .env.example, CORS, JSON parsing, /api/health, basic error handling, and the required npm scripts. Configure the frontend to use VITE_API_URL.
> Keep the React UI minimal and do not implement authentication, users, classes, sessions, bookings, dashboards, recurring schedules, CSV export, alerts, or any other assignment features yet.

### Result & Verification
- Project foundation initialized with `client/`, `server/`, and `docs/`.
- Tested client build (`npm run build`) and Express app initialization (`node src/app.js`).

---

## Step 2: Database Schema & Mongoose Models Design

### Prompt
> Read README.md and the existing docs/schema.md carefully. Do not change any functional requirements.
> Design the Mongoose schemas and explain the relationships for users, members, classes, rooms, sessions, bookings, bookingHistories.
> Update docs/schema.md with collections, fields and types, relationships, indexes, database-level constraints, application-level constraints, deliberate denormalization, and 100x data scaling bottlenecks.
> Create the corresponding Mongoose model files (schemas/models only).

### Result & Verification
- Updated `docs/schema.md` with complete collection documentation, relationships, and indexes.
- Created all 7 Mongoose model files in `server/src/models/`. Verified syntax and model compilation via Node execution script.

---

## Step 3: Authentication & Server-Side Role-Based Authorization

### Prompt
> Read README.md and the existing User Mongoose model before making changes.
> Implement ONLY authentication and server-side role-based authorization.
> Technology: Node.js, Express, MongoDB, Mongoose, JavaScript, bcryptjs, jsonwebtoken.
> Requirement: There are at least two roles: STAFF and INSTRUCTOR. Staff can create/archive classes, schedule sessions, add members, and create/cancel/settle bookings. Instructors can only see and act on sessions where they are the primary or co-instructor. The role difference MUST be enforced on the server.
> Implement:
> 1. Install bcryptjs and jsonwebtoken.
> 2. Create an authentication service (email lookup, password verification, JWT generation, safe user profile).
> 3. Create an auth controller.
> 4. Create POST /api/auth/login.
> 5. Create authentication middleware (Bearer token parsing, JWT verification, active user validation).
> 6. Create reusable role authorization middleware (requireRole('STAFF'), requireRole('INSTRUCTOR')).
> 7. Create protected GET /api/auth/me.
> 8. Add JWT_SECRET and JWT_EXPIRES_IN environment variables. Update .env.example.
> 9. Update docs/architecture.md.
> 10. Update docs/ai-prompts.md.

### Result & Verification
- Installed `bcryptjs` and `jsonwebtoken`.
- Implemented `authService.js`, `authController.js`, `authMiddleware.js`, `roleMiddleware.js`, and `authRoutes.js`.
- Configured environment variables in `.env.example` and `.env`.
- Updated `docs/architecture.md` and `docs/ai-prompts.md`.
- Verified authentication, JWT verification, and role-based access control via Node integration test script.

---

## Step 4: Class Management & Member Management

### Prompt
> Read README.md and the existing Mongoose Class and Member models before making changes.
> Implement ONLY Class management and Member management.
> Class Management: create, edit, archive, restore classes. Endpoints: POST /api/classes, GET /api/classes, GET /api/classes/:id, PATCH /api/classes/:id, PATCH /api/classes/:id/archive, PATCH /api/classes/:id/restore. GET accessible to STAFF and INSTRUCTOR. Mutations require STAFF. Archived classes hidden by default unless includeArchived=true. Validate defaultDuration >= 1, defaultCapacity >= 1.
> Member Management: POST /api/members, GET /api/members, GET /api/members/:id, PATCH /api/members/:id. Email normalized to lowercase and trimmed. Prevent duplicate emails. membershipExpiry required and validated as valid date.
> Controllers thin, business logic in classService.js and memberService.js. Register routes in Express. Update docs/ai-prompts.md.

### Result & Verification
- Implemented `classService.js`, `classController.js`, and `classRoutes.js`.
- Implemented `memberService.js`, `memberController.js`, and `memberRoutes.js`.
- Registered routes in `app.js` under `/api/classes` and `/api/members`.
- Verified Class CRUD, archiving/restoring, `includeArchived` filter, Member creation, duplicate email validation, and expiry updates via Node integration script.

---

## Step 5: Rooms Management, Session Scheduling & Overlap Prevention

### Prompt
> Implement Step 5: Rooms + Sessions + Instructor/Co-instructor scheduling.
> Rooms: STAFF can create, edit, archive, restore rooms. Fields: name, capacity, location, isArchived. Unique room names. Archived rooms hidden by default unless includeArchived=true (STAFF only).
> Sessions: STAFF create/update/cancel sessions. Each session belongs to one class. Fields: classId, date, startTime, primaryInstructor, room, coInstructors, duration, capacity. Fallback to Class defaultDuration and defaultCapacity when omitted. Calculate startDateTime/endDateTime. Validate primaryInstructor and coInstructors refer to active INSTRUCTOR users. Primary instructor cannot be co-instructor. No duplicate co-instructors.
> Instructor visibility: STAFF view all sessions; INSTRUCTOR only view assigned sessions (primary or co-instructor). Enforced server-side.
> Overlap prevention: Room cannot have overlapping SCHEDULED sessions. Instructors (primary or co-instructor) cannot have overlapping SCHEDULED sessions. Condition: existing.startDateTime < newEndDateTime && existing.endDateTime > newStartDateTime. Back-to-back allowed. Cancelled sessions do not block scheduling. Exclude current session ID when updating.
> Controllers thin, logic in roomService.js and sessionService.js. Register routes in app.js. Update docs.

### Result & Verification
- Implemented `roomService.js`, `roomController.js`, and `roomRoutes.js`.
- Implemented `sessionService.js`, `sessionController.js`, and `sessionRoutes.js`.
- Registered routes in `app.js` under `/api/rooms` and `/api/sessions`.
- Updated `docs/architecture.md` and `docs/ai-prompts.md`.
- Verified Room CRUD/archiving, Session creation with default fallbacks, Room overlap prevention, Primary instructor overlap prevention, Co-instructor overlap prevention, back-to-back scheduling, session cancellation slot freeing, and instructor-scoped visibility filtering via Node integration test script.

---

## Step 6: Complete Booking Lifecycle

### Prompt
> Implement Step 6 of the Class Booking assignment: complete Booking Lifecycle.
> Create Booking: STAFF can create booking for any member and session. Reject if membershipExpiry has passed. Prevent duplicate booking for same member + session. If capacity available -> status BOOKED. If session full -> status WAITLISTED. Record initial booking history entry.
> Booking Cancellation: STAFF can cancel BOOKED or WAITLISTED booking. BOOKED -> CANCELLED auto-promotes earliest WAITLISTED booking for same session to BOOKED (based on creation time). WAITLISTED -> CANCELLED cancels cleanly. Record every status change in immutable booking history.
> Attendance: After scheduled start time, STAFF can mark BOOKED as ATTENDED or NO_SHOW. ATTENDED and NO_SHOW are terminal states. Attendance before start time rejected with 400.
> Server-side transition enforcement: Centralized status transition state machine (NONE -> BOOKED/WAITLISTED, BOOKED -> CANCELLED/ATTENDED/NO_SHOW, WAITLISTED -> CANCELLED/BOOKED).
> Immutable history: BookingHistory records (booking, oldStatus, newStatus, changedBy, timestamp, staffNote). Never editable or deletable.
> Concurrency / overbooking: Concurrency-safe capacity checks (MongoDB transactions and per-session mutex locking).
> Endpoints: POST /api/bookings, GET /api/bookings/:id, GET /api/bookings/:id/history, PATCH /api/bookings/:id/cancel, PATCH /api/bookings/:id/attendance.
> Documentation: Update docs/architecture.md, docs/schema.md, docs/decisions.md, docs/ai-prompts.md. Run automated test suite.

### Result & Verification
- Implemented `bookingStateService.js`, `bookingService.js`, `bookingController.js`, and `bookingRoutes.js`.
- Registered routes under `/api/bookings` in `app.js`.
- Created `docs/decisions.md` documenting concurrency control, state machine matrix, waitlist promotion strategy, and start-time attendance rules.
- Created and executed `server/src/tests/testBookingLifecycle.js` automated test suite. Verified all 11 test scenarios:
  1. Available capacity -> `BOOKED`
  2. Full capacity -> `WAITLISTED`
  3. Expired member -> Rejected (400)
  4. Duplicate booking -> Rejected (400)
  5. Attendance before start time -> Rejected (400)
  6. Attendance after start time -> `ATTENDED`
  7. Invalid status transitions -> Forbidden (400)
  8. `BOOKED` cancellation -> Earliest `WAITLISTED` auto-promoted to `BOOKED`
  9. `WAITLISTED` cancellation -> `CANCELLED`
  10. Immutable BookingHistory -> Document modification/deletion blocked by Mongoose pre-hooks
  11. Concurrent booking requests -> Capacity serialized cleanly without overbooking.
