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
