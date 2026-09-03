# Architectural Decisions & Design Rationale

This document logs key architectural decisions, concurrency strategies, state machine rules, and technical trade-offs for the **Class Booking** application.

---

## 1. Concurrency Control & Capacity Safety

### Problem
Simultaneous booking creation requests for a high-demand session can cause race conditions where multiple requests observe available capacity (`bookedCount < session.capacity`) concurrently, leading to session overbooking beyond its configured capacity limit.

### Decision & Implementation
- **Primary Mechanism (MongoDB Transactions)**: Where MongoDB supports multi-document transactions (MongoDB Atlas cluster / Replica Set), `bookingService` uses `mongoose.startSession()` and `session.withTransaction()` to wrap capacity counting, status determination (`BOOKED` vs `WAITLISTED`), booking document creation, and history logging inside an isolated ACID transaction.
- **Secondary Mechanism (Per-Session Mutex Queue)**: To guarantee concurrency safety across both transactional environments and single-node standalone development instances, `bookingService` implements an in-memory per-session execution mutex (`withSessionLock(sessionId, ...)`).
- **Result**: Simultaneous booking requests for the same session are serialized cleanly. Request A completes capacity check and document creation first (status: `BOOKED`), while Request B executes immediately afterwards, observing full capacity and correctly creating a `WAITLISTED` reservation.

---

## 2. Centralized Booking Status Transition State Machine

### Rationale
Scattershot status updates across controllers or routes lead to invalid state corruptions (e.g. attempting to mark attendance for a cancelled booking or re-booking an attended session).

### State Machine Matrix (`server/src/services/bookingStateService.js`)

| Old Status | Allowed Target Statuses | Description |
|---|---|---|
| `NONE` | `BOOKED`, `WAITLISTED` | Initial booking creation depending on available capacity |
| `BOOKED` | `CANCELLED`, `ATTENDED`, `NO_SHOW` | Staff cancellation or attendance settlement |
| `WAITLISTED` | `CANCELLED`, `BOOKED` | Staff cancellation or automatic promotion after cancellation |
| `CANCELLED` | *None* | Terminal state |
| `ATTENDED` | *None* | Terminal state |
| `NO_SHOW` | *None* | Terminal state |

Attempting any transition not listed above immediately throws a `400 Bad Request` error.

---

## 3. Waitlist Auto-Promotion Strategy

### Logic
When a `BOOKED` reservation is cancelled by staff:
1. The target booking status updates from `BOOKED` to `CANCELLED`.
2. The service queries for the earliest waitlisted reservation for that session:
   `Booking.findOne({ session: sessionId, status: 'WAITLISTED' }).sort({ createdAt: 1 })`.
3. If an eligible waitlisted booking is found and the member's `membershipExpiry` is still valid (`>= currentDate`), the waitlisted booking is automatically promoted to `BOOKED`.
4. An immutable `BookingHistory` record is automatically written (`oldStatus: 'WAITLISTED'`, `newStatus: 'BOOKED'`, `staffNote: 'Auto-promoted from waitlist after cancellation'`).

---

## 4. Attendance Settlement Start-Time Rule

### Logic
Attendance (`ATTENDED` or `NO_SHOW`) can **only** be marked after the session's scheduled start time (`new Date() >= session.startDateTime`).
Attempting to mark attendance before `session.startDateTime` throws a `400 Bad Request` error (`Attendance cannot be marked before the session scheduled start time`).
