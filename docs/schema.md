# Database Schema Documentation

This document outlines the MongoDB schema design for the **Class Booking** system using Mongoose ODM.

---

## 1. Collections Overview

The system uses 7 dedicated collections:
1. `users`: System staff and studio instructors.
2. `members`: Studio members who can book sessions.
3. `classes`: Class templates/definitions (e.g., Vinyasa Yoga, HIIT Circuit).
4. `rooms`: Studio rooms/spaces where sessions take place.
5. `sessions`: Scheduled instances of a class with specific time, room, and instructors.
6. `bookings`: Reservations made by members for specific sessions.
7. `bookingHistories`: Audit logs tracking status transitions for bookings.

---

## 2. Collections, Fields, and Data Types

### 2.1 `users`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `name` | String | Required, trim | Full name of the user |
| `email` | String | Required, unique, lowercase, trim | Email address used for login/identification |
| `passwordHash` | String | Required, select: false | Hashed password (bcrypt) |
| `role` | String | Required, enum: `['STAFF', 'INSTRUCTOR']` | Role of the user |
| `isActive` | Boolean | Default: `true` | Account status flag |
| `createdAt` | Date | Auto (timestamps) | Creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last update timestamp |

### 2.2 `members`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `name` | String | Required, trim | Full name of member |
| `email` | String | Required, unique, lowercase, trim | Contact email |
| `membershipExpiry`| Date | Required | Expiration date of membership |
| `createdAt` | Date | Auto (timestamps) | Creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last update timestamp |

### 2.3 `classes`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `title` | String | Required, trim | Name of the class (e.g., Hot Yoga) |
| `description` | String | Trim | Detailed description |
| `discipline` | String | Required, trim | Category/Discipline (e.g., Yoga, Pilates, Boxing) |
| `defaultDuration` | Number | Required, min: 1 | Standard duration in minutes |
| `defaultCapacity` | Number | Required, min: 1 | Standard max capacity |
| `isArchived` | Boolean | Default: `false` | Soft-delete/archived flag |
| `createdAt` | Date | Auto (timestamps) | Creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last update timestamp |

### 2.4 `rooms`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `name` | String | Required, trim, unique | Room name/identifier (e.g., Studio A) |
| `capacity` | Number | Required, min: 1 | Max seating/mat capacity |
| `location` | String | Trim | Floor or location description |
| `isArchived` | Boolean | Default: `false` | Soft-delete/archived flag |
| `createdAt` | Date | Auto (timestamps) | Creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last update timestamp |

### 2.5 `sessions`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `classId` | ObjectId | Required, Ref: `'Class'` | Parent class template |
| `date` | Date | Required | Scheduled date (UTC start of day) |
| `startTime` | String | Required | Start time string (e.g. `"09:00"`) |
| `duration` | Number | Required, min: 1 | Session duration in minutes |
| `startDateTime` | Date | Required, Indexed | Exact combined start timestamp |
| `endDateTime` | Date | Required, Indexed | Exact combined end timestamp (`startDateTime` + `duration`) |
| `capacity` | Number | Required, min: 1 | Session capacity cap |
| `primaryInstructor`| ObjectId | Required, Ref: `'User'` | Main assigned instructor |
| `coInstructors` | [ObjectId] | Ref: `'User'` | Optional co-instructors |
| `room` | ObjectId | Required, Ref: `'Room'` | Studio room assignment |
| `status` | String | Required, enum: `['SCHEDULED', 'COMPLETED', 'CANCELLED']`, default: `'SCHEDULED'` | Lifecycle status |
| `createdAt` | Date | Auto (timestamps) | Creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last update timestamp |

### 2.6 `bookings`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `member` | ObjectId | Required, Ref: `'Member'` | Booking member |
| `session` | ObjectId | Required, Ref: `'Session'` | Target class session |
| `status` | String | Required, enum: `['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']`, default: `'BOOKED'` | Current status |
| `createdAt` | Date | Auto (timestamps) | Booking creation timestamp |
| `updatedAt` | Date | Auto (timestamps) | Last status change timestamp |

*Indexes*: Compound unique index `{ member: 1, session: 1 }` enforces single booking per member per session at database level.

### 2.7 `bookingHistories`
| Field | Type | Options / Validation | Description |
|---|---|---|---|
| `_id` | ObjectId | Auto-generated | Primary Key |
| `booking` | ObjectId | Required, Ref: `'Booking'` | Parent booking ID |
| `oldStatus` | String | Required, enum: `['NONE', 'BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']` | Previous status |
| `newStatus` | String | Required, enum: `['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']` | New status |
| `changedBy` | ObjectId | Required, Ref: `'User'` | User who performed the status change. Must be an authorized STAFF or assigned INSTRUCTOR.  |
| `timestamp` | Date | Default: `Date.now` | Event timestamp |
| `staffNote` | String | Trimmed, optional | Staff notes/comments |

*Immutability Enforcement*: Pre-save, pre-update, and pre-remove hooks reject any edit or delete operations, ensuring an append-only audit log.

---

## 3. Entity Relationships (References vs Embedded)

### Normalized ObjectId References
- **`Session -> Class, Room, User`**: Sessions reference classes, rooms, and users. Embeds are avoided because class titles, room names, or instructor profile updates should reflect dynamically without stale denormalized data.
- **`Booking -> Member, Session`**: Bookings reference members and sessions. This allows independent queries, aggregations, and updates without document size growth limits.
- **`BookingHistory -> Booking, User`**: History entries reference parent bookings and users for auditability.

### Deliberate Denormalization
- **`startDateTime` & `endDateTime` in `Session`**: Computed from `date`, `startTime`, and `duration`. Denormalizing these exact timestamps allows efficient time-range queries for room and instructor overlap detection using the condition existing.startDateTime < newEndDateTime AND existing.endDateTime > newStartDateTime.

---

## 4. Indexes Strategy

| Collection | Index Fields | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Fast lookup and uniqueness enforcement |
| `members` | `{ email: 1 }` | Unique | Fast lookup and uniqueness enforcement |
| `members` | `{ membershipExpiry: 1 }` | Single | Querying active/expired memberships |
| `classes` | `{ title: "text", discipline: "text" }` | Text | Title/discipline search |
| `classes` | `{ isArchived: 1 }` | Single | Filtering active vs archived classes |
| `rooms` | `{ name: 1 }` | Unique | Room name uniqueness |
| `sessions` | `{ date: 1 }` | Single | Fast schedule lookup by date |
| `sessions` | `{ startDateTime: 1, endDateTime: 1 }` | Compound | Range queries for schedules |
| `sessions` | `{ room: 1, startDateTime: 1, endDateTime: 1 }` | Compound | Room overlap collision detection |
| `sessions` | `{ primaryInstructor: 1, startDateTime: 1, endDateTime: 1 }` | Compound | Primary instructor overlap collision detection |
| `sessions` | `{ coInstructors: 1, startDateTime: 1, endDateTime: 1 }` | Compound | Co-instructors overlap collision detection |
| `bookings` | `{ member: 1, session: 1 }` | Compound Unique | Prevents duplicate bookings for the same session |
| `bookings` | `{ session: 1, status: 1 }` | Compound | Efficient roster and capacity/waitlist calculation |
| `bookings` | `{ member: 1, status: 1, createdAt: -1 }` | Compound | Member booking history queries |
| `bookings` | `{ status: 1, createdAt: -1 }` | Compound | Filtering and sorting bookings |
| `bookingHistories` | `{ booking: 1, timestamp: -1 }` | Compound | Chronological audit trail lookup per booking |

---

## 5. Database-level Constraints

1. **Unique Email**: `users` and `members` collections enforce `unique: true` on `email`.
2. **Unique Room Name**: `rooms` collection enforces `unique: true` on `name`.
3. **No Duplicate Bookings**: `bookings` collection enforces compound unique index on `{ member: 1, session: 1 }`.
4. **Enum Validations**:
   - `User.role`: `['STAFF', 'INSTRUCTOR']`
   - `Session.status`: `['SCHEDULED', 'COMPLETED', 'CANCELLED']`
   - `Booking.status`: `['BOOKED', 'WAITLISTED', 'CANCELLED', 'ATTENDED', 'NO_SHOW']`

---

## 6. Application-level Constraints

1. **Immutable Booking History**: Mongoose pre-hooks (`save`, `updateOne`, `findOneAndUpdate`, `deleteOne`) prevent modifications or deletions of documents in `bookingHistories`.
2. **Room & Full Instructor Overlap Check**: Application layer queries existing sessions using compound indexes before session creation or update to verify no time overlap exists for:
   - The room (`{ room, startDateTime, endDateTime }`)
   - The primary instructor (`{ primaryInstructor, startDateTime, endDateTime }`)
   - Any assigned co-instructors (`{ coInstructors, startDateTime, endDateTime }`)
3. **Session Capacity Cap**: Application layer validates that active `BOOKED` count does not exceed `session.capacity` before confirming a booking (otherwise placing on `WAITLISTED`).
4. **Membership Validity & Booking Eligibility Check**: Membership validity is derived from membershipExpiry; no separate membership status field is stored. The booking service checks the current time against member.membershipExpiry, and expired memberships cannot create new bookings.

---

## 7. What Might Become a Bottleneck at 100x the Data

1. **Unbounded `bookingHistories` Growth**: As bookings accumulate status transitions, history documents will grow rapidly. *Mitigation*: Compound index `{ booking: 1, timestamp: -1 }` keeps queries fast; archived cold storage can be introduced at scale.
2. **Overlap Query Index Size**: High volume of historical sessions will increase compound index size for `{ room: 1, startDateTime: 1, endDateTime: 1 }` and `{ primaryInstructor/coInstructors: 1, startDateTime: 1, endDateTime: 1 }`. *Mitigation*: Partial indexes filtering only active/future sessions (`status: 'SCHEDULED'`).
3. **Waitlist Auto-promotion Concurrency**: High-demand sessions with simultaneous cancellations and waitlist promotions can suffer from race conditions. Mitigation: MongoDB transactions keep booking creation, cancellation, waitlist promotion, and history creation atomic. An in-process per-session lock additionally serializes concurrent booking operations within the same server instance.