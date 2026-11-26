# Hiva 🐝

**Find your hive.** Hiva is a campus events platform where clubs run events and students discover, register and check in with QR tickets.

Hiva is an independent student project and is not an official service of any university.

---

## ✨ Features

**For students**
- Sign up, complete profile (PRN, department, year)
- Browse and search events by name, club, category and price, upcoming or past
- One-click registration with seat limits
- QR ticket in the app + downloadable PDF ticket
- Cancel a registration before the event starts
- Follow clubs and get "Recommended for you" events

**For clubs**
- Request a new club (approved by admin)
- Team roles: owner, organizer, volunteer
- Create events → submit for approval → publish
- Attendee list and CSV export
- Camera-based QR scanner at the door with live attendance count

**For admins**
- Approve or reject clubs, events and club team members
- Manage users and roles
- Analytics dashboard

## 🔒 Built to be safe
- Atomic seat booking: seats never go below zero, even with many students registering at once
- A ticket can be scanned only once, even at two gates at the same time
- QR codes contain only a random ticket ID, no personal data
- Session-based login, CSRF protection, rate limiting and role-based access control
- Image uploads checked by file content
- Important admin actions are recorded in an audit log on the server

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite |
| Backend | Node.js, Express |
| Database | MongoDB (Mongoose) |
| Validation | Zod |
| Testing | Jest, Supertest |
| Deployment | Vercel, MongoDB Atlas, Vercel Blob |

## 🚀 Run locally

**Requirements:** Node.js 20+ and MongoDB running locally

```bash
# 1. Install everything
npm run install:all

# 2. Set up the backend environment file
cp backend/.env.example backend/.env
# then edit backend/.env: set SESSION_SECRET (a long random string)
# and SUPER_ADMIN_EMAIL (your email). MONGODB_URI defaults to local MongoDB.
# (client/.env is optional: the website talks to the API on the same site by default)

# 3. Optional: add sample data. WARNING: this deletes all existing
#    clubs, events and registrations first.
npm run seed --prefix backend -- --reset

# 4. Create your admin account (uses SUPER_ADMIN_EMAIL from backend/.env)
SUPER_ADMIN_PASSWORD='a-long-unique-password' npm run create-admin --prefix backend

# 5. Start the API and the website (two terminals)
npm run dev:api
npm run dev:web
```

Open http://localhost:3000

> **Windows (PowerShell):** if scripts are blocked, use `npm.cmd` instead of `npm`. Set the admin password like this:
> `$env:SUPER_ADMIN_PASSWORD = "a-long-unique-password"; npm.cmd run create-admin --prefix backend; Remove-Item Env:SUPER_ADMIN_PASSWORD`

## 🧪 Tests

```bash
npm test
```

The tests use throwaway databases and never touch your data. To run them against your local MongoDB instead of downloading an in-memory one, set `MONGO_TEST_URI=mongodb://127.0.0.1:27017` first.

## 📦 Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for the step-by-step Vercel + MongoDB Atlas guide.

## 👩‍💻 Author
**Yashvi Ashara**: M.Sc Blockchain Technology student  
[LinkedIn](#) · [X](#) · [GitHub](#)
