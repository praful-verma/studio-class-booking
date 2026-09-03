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

## General Note

I used AI mainly as a coding assistant during the implementation. I reviewed the generated code, compared it with the README requirements, made corrections where necessary, and tested the important flows myself.
