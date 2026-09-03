# Architectural Decisions & Design Rationale

This file contains the main technical decisions I made while building the Class Booking application. I have focused on decisions where there was more than one possible approach.

---

## 1. Handling Concurrent Bookings

### Problem

Two users could try to book the same session at almost the same time. If both requests check the available capacity before either booking is saved, the session could become overbooked.

### Decision

I used MongoDB transactions for the booking operation so that the capacity check and booking creation are handled together.

For local development where transactions may not be available, I also added a per-session lock so that booking requests for the same session are processed one at a time.

### Why

The main goal was to make sure the session capacity cannot be exceeded even when multiple booking requests arrive together.

---

## 2. Booking Status State Machine

### Problem

Booking status can change in several ways, and allowing status updates from different places in the code could result in invalid transitions.

### Decision

I created a separate booking state service to control the allowed status changes.

| Current Status | Allowed Status               |
| -------------- | ---------------------------- |
| NONE           | BOOKED, WAITLISTED           |
| BOOKED         | CANCELLED, ATTENDED, NO_SHOW |
| WAITLISTED     | CANCELLED, BOOKED            |
| CANCELLED      | None                         |
| ATTENDED       | None                         |
| NO_SHOW        | None                         |

### Why

Keeping these rules in one place makes the booking flow easier to understand and prevents invalid status changes.

---

## 3. Waitlist Promotion

### Problem

When a booked member cancels, the available place should go to someone on the waitlist.

### Decision

I promote the earliest waitlisted booking based on its creation time.

Before promoting it, the member's membership expiry is checked. A new `BookingHistory` entry is also created for the promotion.

### Why

Using creation time gives a simple first-come-first-served order for the waitlist.

---

## 4. Attendance Rule

### Problem

Attendance should not be marked before a session actually starts.

### Decision

I added a server-side check that compares the current time with the session's `startDateTime`. Attendance can only be marked after the scheduled start time.

### Why

This prevents attendance from being recorded accidentally or manipulated from the frontend.

---

## 5. Sorting and CSV Export

### Problem

The booking list needs sorting, and the attendance data needs to be exported as CSV.

### Decision

For sorting, I used a whitelist of allowed fields instead of directly accepting any field from the request. Session date sorting is handled using a MongoDB aggregation so that filtering, sorting and pagination stay on the database side.

For CSV export, I added escaping for commas, quotes and new lines so that member names or emails do not break the CSV format.

### Why

The whitelist keeps the sorting API predictable and safer, while database-level sorting avoids loading all bookings into memory. Proper CSV escaping keeps the exported file usable when opened in spreadsheet applications.

---

## 6. Recurring Session Generation & Conflict Handling

### Problem

When generating sessions across a multi-week date range, some dates may have room or instructor scheduling conflicts, or duplicate sessions may already exist from prior generation runs. Rolling back the entire batch because of a single conflict would force staff to manually create individual sessions.

### Decision

I implemented a partial-success model for `POST /api/sessions/recurring`. Each matching date in the date range is processed independently:

* Valid non-conflicting dates create a scheduled session document.
* Conflicting or duplicate dates are skipped and recorded in a `skippedSessions` array with a descriptive reason (e.g., `'Room scheduling conflict...'`, `'Instructor scheduling conflict...'`, or `'Duplicate session already exists...'`).
* The API returns a summary containing `{ created, skipped, createdSessions, skippedSessions }`.

### Why

This provides staff with transparent feedback on what succeeded and what was skipped, without aborting valid sessions or creating corrupt/overlapping schedule entries.

