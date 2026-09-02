# System Architecture Documentation

This document describes the technical architecture, request lifecycles, and security model for the **Class Booking** application.

---

## 1. Overview & Monorepo Structure

```
class-booking/
├── client/           # React + Vite Frontend
├── server/           # Node.js + Express Backend API
│   ├── src/
│   │   ├── config/      # DB connection config
│   │   ├── controllers/ # HTTP request handlers
│   │   ├── middleware/  # Auth, role authorization, error handling
│   │   ├── models/      # Mongoose MongoDB schemas
│   │   ├── routes/      # API endpoints definitions
│   │   ├── services/    # Core business logic
│   │   ├── utils/       # Helper functions
│   │   ├── app.js       # Express app setup & route mounting
│   │   └── server.js    # HTTP listener entry point
└── docs/             # Technical architecture & schema docs
```

---

## 2. Authentication & Authorization Architecture

### 2.1 Password Security & Explicit Selection
- Passwords are hashed using `bcryptjs` before storage in MongoDB.
- In the `User` Mongoose schema, `passwordHash` is defined with `select: false` to ensure password hashes are never returned by default in queries or API responses.
- During authentication (`POST /api/auth/login`), `authService` explicitly includes the field using `User.findOne({ email }).select('+passwordHash')` to perform bcrypt hash verification.

### 2.2 JWT Token Architecture
- Upon successful password verification, `authService` signs a JsonWebToken (JWT) containing a minimal payload:
  ```json
  {
    "userId": "66d5b0a1c2e4f3a8b9d7e1c2",
    "role": "STAFF",
    "iat": 1725270000,
    "exp": 1725356400
  }
  ```
- Secrets (`JWT_SECRET`) and expiration durations (`JWT_EXPIRES_IN`) are configured dynamically via environment variables.

---

## 3. Request Authentication Lifecycle

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant AuthMW as authenticate Middleware
    participant RoleMW as requireRole Middleware
    participant Controller as Route Controller
    participant DB as MongoDB Database

    Client->>Express: Request (Header: Authorization: Bearer <token>)
    Express->>AuthMW: Intercept Request
    alt Token Missing / Invalid / Expired
        AuthMW-->>Client: 401 Unauthorized { status: "error", message: "..." }
    else Token Valid
        AuthMW->>DB: User.findById(decoded.userId)
        DB-->>AuthMW: User Document
        alt User Not Found or Inactive
            AuthMW-->>Client: 401 Unauthorized { status: "error", message: "User account inactive" }
        else User Active
            AuthMW->>AuthMW: Strip passwordHash & attach safe user to req.user
            AuthMW->>RoleMW: Call next()
            alt Role Authorized (e.g. req.user.role === 'STAFF')
                RoleMW->>Controller: Call next()
                Controller->>Client: 200 OK Response { status: "success", data: ... }
            else Role Unauthorized
                RoleMW-->>Client: 403 Forbidden { status: "error", message: "Access denied" }
            end
        end
    end
```

---

## 4. Implemented API Endpoint Authorization Matrix

### 4.1 Authentication Routes (`/api/auth`)
- `POST /api/auth/login` — Public
- `GET /api/auth/me` — Protected (`authenticate`)

### 4.2 Class Management Routes (`/api/classes`)
- `GET /api/classes` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`). Returns active classes. `includeArchived=true` parameter is strictly restricted to `STAFF` users (returns `403 Forbidden` if requested by `INSTRUCTOR`).
- `GET /api/classes/:id` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`).
- `POST /api/classes` — Protected (`requireRole('STAFF')`). Validates `defaultDuration >= 1` and `defaultCapacity >= 1`.
- `PATCH /api/classes/:id` — Protected (`requireRole('STAFF')`).
- `PATCH /api/classes/:id/archive` — Protected (`requireRole('STAFF')`). Soft-archives class without deleting existing sessions or bookings.
- `PATCH /api/classes/:id/restore` — Protected (`requireRole('STAFF')`). Reactivates an archived class.

### 4.3 Member Management Routes (`/api/members`)
- `GET /api/members` — Protected (`requireRole('STAFF')`). Access denied for `INSTRUCTOR` (`403 Forbidden`).
- `GET /api/members/:id` — Protected (`requireRole('STAFF')`). Access denied for `INSTRUCTOR` (`403 Forbidden`).
- `POST /api/members` — Protected (`requireRole('STAFF')`). Trims/lowercases email, enforces email uniqueness, validates `membershipExpiry`.
- `PATCH /api/members/:id` — Protected (`requireRole('STAFF')`). Allows updating member details and renewing/updating `membershipExpiry` dates.

### 4.4 Room Management Routes (`/api/rooms`)
- `GET /api/rooms` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`). Excludes archived rooms by default. `includeArchived=true` restricted to `STAFF`.
- `GET /api/rooms/:id` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`).
- `POST /api/rooms` — Protected (`requireRole('STAFF')`). Enforces unique room name and `capacity >= 1`.
- `PATCH /api/rooms/:id` — Protected (`requireRole('STAFF')`).
- `PATCH /api/rooms/:id/archive` — Protected (`requireRole('STAFF')`). Soft-archives room.
- `PATCH /api/rooms/:id/restore` — Protected (`requireRole('STAFF')`). Reactivates room.

### 4.5 Session Scheduling Routes (`/api/sessions`)
- `GET /api/sessions` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`). Server-side role filtering: `INSTRUCTOR` users only receive sessions where they are assigned as primary or co-instructor.
- `GET /api/sessions/:id` — Protected (`requireRole('STAFF', 'INSTRUCTOR')`). Server-side authorization check ensures instructors can only view assigned sessions.
- `POST /api/sessions` — Protected (`requireRole('STAFF')`). Validates class, room, active `INSTRUCTOR` roles, computes `startDateTime`/`endDateTime`, and enforces room/instructor overlap prevention.
- `PATCH /api/sessions/:id` — Protected (`requireRole('STAFF')`). Updates session schedule with overlap verification excluding current session ID.
- `DELETE /api/sessions/:id` / `PATCH /api/sessions/:id/cancel` — Protected (`requireRole('STAFF')`). Sets status to `CANCELLED`, freeing up room and instructor time slots.

---

## 5. Overlap Prevention Algorithm & Business Rules

1. **Overlap Condition**:
   A collision exists if an existing non-cancelled session satisfies:
   `existing.startDateTime < newEndDateTime AND existing.endDateTime > newStartDateTime`
2. **Room Collision Prevention**:
   No two active (`SCHEDULED`) sessions can share the same `room` during overlapping time slots.
3. **Instructor Collision Prevention**:
   No active `INSTRUCTOR` user can be double-booked during overlapping time slots, whether assigned as `primaryInstructor` or as a `coInstructor`.
4. **Contiguous Sessions**:
   Back-to-back sessions are permitted (where `endDateTime` of session A equals `startDateTime` of session B).
5. **Cancelled Sessions**:
   Sessions marked `CANCELLED` are ignored during overlap checks, allowing the time slot to be reused.
