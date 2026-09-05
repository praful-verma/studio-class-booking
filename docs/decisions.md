# Architectural Decisions & Design Rationale

This file records the main technical decisions made while building the Class Booking application. I focused on areas where there were multiple possible approaches and where the choice affects correctness or maintainability.

## 1. Handling Concurrent Bookings

### Problem

Two users could try to book the same session at almost the same time. If both requests check capacity before either booking is saved, the session could become overbooked.

### Decision

I use MongoDB transactions for booking creation, cancellation, waitlist promotion, and related history creation.

For local development environments where MongoDB transactions are unavailable, I also use a per-session in-memory lock to serialize booking operations.

### Why

The main goal is to make sure session capacity cannot be exceeded when multiple booking requests arrive together.

---

## 2. Booking Status State Machine

### Problem

Booking status can change in several ways. If status updates are handled independently in different parts of the application, invalid transitions can be introduced.

### Decision

I created a separate booking state service that controls the allowed status transitions.

| Current Status         | Allowed Status                     |
| ---------------------- | ---------------------------------- |
| Initial state (`NONE`) | `BOOKED`, `WAITLISTED`             |
| `BOOKED`               | `CANCELLED`, `ATTENDED`, `NO_SHOW` |
| `WAITLISTED`           | `CANCELLED`, `BOOKED`              |
| `CANCELLED`            | None                               |
| `ATTENDED`             | None                               |
| `NO_SHOW`              | None                               |

`NONE` is used only for the initial booking history entry and is not a persisted Booking status.

### Why

Keeping these rules in one place makes the booking flow easier to understand and prevents invalid status changes.

---

## 3. Waitlist Promotion

### Problem

When a booked member cancels, the available place should go to someone on the waitlist.

### Decision

I promote the earliest waitlisted booking based on its creation time.

Before promoting the booking, the member's membership expiry is checked. A new `BookingHistory` entry is also created for the promotion.

The cancellation, waitlist promotion, and related history entries are performed within the same MongoDB transaction.

### Why

Using creation time provides a simple first-come-first-served waitlist order.

Keeping the cancellation and promotion in the same transaction ensures that either the complete operation succeeds or none of it is applied.

---

## 4. Attendance Rule

### Problem

Attendance should not be marked before a session actually starts.

### Decision

The server compares the current time with the session's `startDateTime`. Attendance can only be marked after the scheduled start time.

### Why

This prevents attendance from being recorded accidentally or manipulated through the frontend.

---

## 5. Sorting and CSV Export

### Problem

The booking list needs sorting, and attendance data needs to be exported as CSV.

### Decision

For sorting, I use a whitelist of allowed fields instead of directly accepting any field from the request.

Booking filtering, sorting, and pagination are performed server-side. Session date/time sorting is handled through MongoDB aggregation.

For CSV export, values are escaped for commas, quotes, and new lines so that member names or emails do not break the CSV format.

### Why

The whitelist keeps the sorting API predictable and safer. Database-level filtering, sorting, and pagination also avoids loading all bookings into the browser.

Proper CSV escaping keeps the exported file usable in spreadsheet applications.

---

## 6. Recurring Session Generation & Conflict Handling

### Problem

When generating sessions across a multi-week date range, some dates may have room or instructor scheduling conflicts. Duplicate sessions may also already exist from a previous generation attempt.

Rolling back the entire batch because of one conflict would force staff to create the remaining sessions manually.

### Decision

I implemented a partial-success model for `POST /api/sessions/recurring`.

Each matching date is processed independently:

* Valid, non-conflicting dates create a scheduled session.
* Conflicting or duplicate dates are skipped.
* Skipped dates are recorded in `skippedSessions` with a descriptive reason such as:

  * Room scheduling conflict
  * Instructor scheduling conflict
  * Duplicate session already exists
* The API returns a summary containing:
  `created`, `skipped`, `createdSessions`, and `skippedSessions`.

### Why

Partial success makes the bulk operation more useful because one conflict does not prevent all valid sessions from being created.

Returning the skip reasons also gives staff enough information to fix conflicts and retry the affected dates.

---

## 7. Membership Expiry Alert Dismissal & Reappearance

### Problem

Staff need to dismiss a membership expiry alert without changing the member's actual `membershipExpiry` date.

A simple boolean such as `isDismissed: true` would permanently hide future alerts for that member, even after the member renews.

### Decision

I added a `dismissedExpiryDate` field to the Member schema.

When staff dismisses an alert through `PATCH /api/membership-alerts/:memberId/dismiss`, `dismissedExpiryDate` is set to the member's current `membershipExpiry`.

An alert is active only when:

1. The membership is expired or expires within the next 7 days.
2. `dismissedExpiryDate` is null, or it does not equal the current `membershipExpiry`.

### Why

This allows the current alert to be dismissed without changing the actual membership expiry date.

When the member renews, the new `membershipExpiry` no longer matches `dismissedExpiryDate`. The alert can therefore appear again when the new expiry enters the 7-day window.

---

## 8. Deriving Membership Validity Instead of Storing Status

### Problem

The member model initially included a separate membership status such as `ACTIVE` or `EXPIRED`.

This created two sources of truth because the stored status could disagree with the actual `membershipExpiry` date.

### Initial Decision

I initially considered storing an explicit membership status field.

### Reversed Decision

I later removed the status field and decided to derive membership validity from `membershipExpiry` at runtime.

### Why I Reversed It

The expiry date is already the authoritative piece of information.

Deriving validity avoids synchronization problems and removes the need to update a status field as time passes.

### Result

The booking service checks `membershipExpiry` when determining whether a member can create a new booking.

Membership expiry alerts also use the same date-based logic.
