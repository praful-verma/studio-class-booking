# Studio Class Booking System — Submission

## Live Demo

**Frontend:** https://studio-class-booking.vercel.app/

**Backend:** https://studio-class-booking-hheb.onrender.com

**API health check:** https://studio-class-booking-hheb.onrender.com/api/health

## Demo Login

### Staff
- Email: `staff@demo.com`
- Password: `Demo@123`

### Instructor
- Email: `instructor@demo.com`
- Password: `Demo@123`

The Staff account can be used to explore the complete application. The Instructor account can be used to check the restricted instructor workflow and permissions.

## What is included

The application covers the main requirements of the assignment:

- Staff and Instructor authentication with role-based access
- Class creation, editing, archiving and restoring
- Member management with membership expiry
- Room management
- Session scheduling with duration and capacity overrides
- Instructor and room overlap checks
- Primary and co-instructor support
- Booking with capacity and automatic waitlisting
- Duplicate booking prevention
- Membership expiry validation
- Booking cancellation with waitlist promotion
- Attendance and no-show marking
- Server-side booking search, filtering, sorting and pagination
- Attendance CSV export
- Recurring session generation with skipped-conflict reporting
- Dashboard metrics and 8-week attendance data
- Membership expiry alerts with dismissal and reappearance
- Immutable booking status history

## Tech Stack

- React + Vite
- Vanilla CSS
- Node.js + Express
- MongoDB Atlas
- Mongoose
- JWT
- bcryptjs
- Vercel
- Render

## Testing

The application was tested end-to-end before deployment.

- 33 browser E2E scenarios passed
- Booking lifecycle regression tests passed
- Booking search and attendance export tests passed
- Recurring session tests passed
- Dashboard and membership alert tests passed
- Instructor/user endpoint tests passed
- Frontend production build completed successfully

The production database was cleaned after testing so the live demo contains representative data rather than automated test records.

## Project Structure

```text
client/                 React frontend
server/                 Express API
docs/
  architecture.md       Application architecture
  schema.md             Database schema and relationships
  plan.md               Implementation plan and progress
  decisions.md          Key technical decisions
  ai-prompts.md         AI-assisted development log
README.md               Project setup and overview
```

## Running Locally

Install dependencies and start the frontend and backend using the commands documented in the project README.

The server requires:

```text
MONGODB_URI
JWT_SECRET
JWT_EXPIRES_IN
```

The frontend uses:

```text
VITE_API_URL
```

No production secrets are included in the repository.

## Notes

The application is deployed with MongoDB Atlas as the database, Render for the API and Vercel for the frontend.

The repository includes the implementation history and supporting documentation used during development.
