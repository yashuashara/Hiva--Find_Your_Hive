# Hiva

**Find your hive.** A campus platform where student clubs publish events, students register in one tap, and organizers check people in by scanning QR tickets at the door.

Hiva is an independent student project. It is not an official service of any university.

## Features

- **Clubs.** Any student can request a club. A university admin approves it, and the requester becomes its owner. Owners build a team of organizers (run events) and volunteers (scan tickets); each person an owner adds needs admin approval. Students can follow clubs.
- **Event approval workflow.** Events move through `draft → pending approval → approved → published → completed`, with `rejected` and `cancelled` states. Organizers submit, admins approve or reject with a reason, and cancelling an event cancels all its tickets.
- **Student registration.** Students register from their profile (PRN, department, year). Seats are reserved atomically and the database enforces one active ticket per student, so events never oversell, even under concurrent requests. Students can cancel before an event starts.
- **QR tickets and PDF.** Every ticket has a QR code containing only a random 128-bit ticket ID (no personal data) and can be downloaded as a PDF.
- **Door scanner.** Organizers and volunteers scan tickets with a phone camera. Results show instantly (valid, already checked in, cancelled, wrong event, expired), with sound and vibration. Every scan is verified on the server, and each ticket works exactly once.
- **Live attendance.** Check-in counts refresh every few seconds on every scanner and on the event page while the event is running.
- **Analytics.** Admin, club and student dashboards show registrations per day, attendance at past events, seats filled and per-event performance, all computed in the database.
- **Role-based access.** Students, club owners, organizers, volunteers, university admins and a super admin. Permissions are enforced on the server for every request; club roles only apply while a club is approved.

Also included: event discovery with search, filters and pagination; recommendations; light and dark themes; image uploads for banners and logos; email confirmations (optional); CSV attendee export; and an audit log of admin actions.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, React Router 7, framer-motion, qrcode, qr-scanner, jsPDF |
| Backend | Node.js (20+), Express 4, Mongoose 7, zod validation |
| Database | MongoDB |
| Auth & security | Session cookies (httpOnly, MongoDB-backed), scrypt password hashing, helmet, rate limiting, CSRF header check, strict Content Security Policy |
| Email & files | nodemailer (SMTP), multer + Vercel Blob for image uploads |
| Testing | Jest and Supertest (109 tests, including concurrency cases) |
| Deployment | Vercel (static site + serverless API), MongoDB Atlas, GitHub Actions CI |

## Run locally

**Prerequisites:** Node.js 20 or newer, and MongoDB running locally on the default port (27017).

1. **Install dependencies** (from the project root):

   ```bash
   npm run install:all
   ```

2. **Configure the backend.** Copy `backend/.env.example` to `backend/.env` and set `SESSION_SECRET` to a long random string:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   The other defaults work for local development.

3. **Optional: load sample data** into an empty database. This **deletes** all clubs, events and registrations first:

   ```bash
   cd backend
   npm run seed -- --reset
   ```

4. **Create your admin account.** Set `SUPER_ADMIN_EMAIL` in `backend/.env`, then in the `backend` folder run:

   ```bash
   SUPER_ADMIN_PASSWORD='a-long-unique-password' npm run create-admin
   ```

   On Windows PowerShell:

   ```powershell
   $env:SUPER_ADMIN_PASSWORD = "a-long-unique-password"; npm.cmd run create-admin; Remove-Item Env:SUPER_ADMIN_PASSWORD
   ```

5. **Start the app** in two terminals (from the project root):

   ```bash
   npm run dev:api   # API on http://localhost:5000
   npm run dev:web   # website on http://localhost:3000
   ```

   Open **http://localhost:3000**. The website forwards `/api` requests to the API, so no extra setup is needed.

> **Windows tip:** if PowerShell says running scripts is disabled, use `npm.cmd` instead of `npm`, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Running the tests

The backend tests use a throwaway database for each test file and never touch your real data:

```bash
cd backend
MONGO_TEST_URI=mongodb://127.0.0.1:27017 npm test
```

Without `MONGO_TEST_URI`, the tests start an in-memory MongoDB instead (this downloads a MongoDB binary the first time).

## Project structure

```
api/          Vercel serverless entry point (wraps the Express app)
backend/      Express API: routes, controllers, models, services, tests, scripts
client/       React app: pages, components, hooks, styles
DEPLOYMENT.md Step-by-step production deployment (Vercel, Atlas, Blob)
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the full guide: GitHub, MongoDB Atlas, Vercel, Vercel Blob, creating the admin account, backups and rollbacks.
