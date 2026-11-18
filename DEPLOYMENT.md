# Deploying Event Engine

Everything runs on **Vercel**: the React app is served as static files and the
Express API runs as one serverless function (`api/index.js`) on the same
domain under `/api`. Data lives in **MongoDB Atlas**; uploaded images live in
**Vercel Blob**.

```
Browser ──► https://your-app.vercel.app
              ├── /            static React build (client/dist)
              └── /api/*  ──►  serverless function ──► MongoDB Atlas
                                                    └─► Vercel Blob (images)
```

Because the site and the API share one domain, login cookies are first-party
(`SameSite=Lax`): no CORS setup, no cross-site cookie settings.

Time needed: about 30–45 minutes the first time.

---

## 1. Put the code on GitHub (private)

1. Create a GitHub account if you don't have one.
2. On github.com, click **New repository**. Name it `event-engine`, choose
   **Private**, and do **not** add a README, .gitignore or licence (the
   project already has them).
3. In GitHub **Settings > Emails**, tick **Keep my email addresses private** and
   copy your `…@users.noreply.github.com` address. Commits will use it so
   your personal email is never published.
4. In a terminal in the project folder:

   ```bash
   git remote add origin https://github.com/<your-username>/event-engine.git
   git push -u origin main
   ```

   Git will ask you to sign in to GitHub in the browser the first time.

The **CI** workflow (`.github/workflows/ci.yml`) now runs the backend tests
and a frontend build on every push. Check the **Actions** tab.

## 2. Create the database (MongoDB Atlas)

1. Sign up at <https://www.mongodb.com/cloud/atlas> and create a **free M0** cluster.
   Pick the region closest to your users (e.g. Mumbai, `ap-south-1`).
2. **Database Access > Add user**: username `event-engine`, a long generated
   password, role **Read and write to any database**. Save the password.
3. **Network Access > Add IP address > Allow access from anywhere (0.0.0.0/0)**.
   Vercel's servers do not have fixed IP addresses, so this is required.
   The database is still protected by the user/password above.
4. **Connect > Drivers**: copy the connection string and fill in the
   password and a database name, e.g.
   `mongodb+srv://event-engine:<password>@cluster0.xxxxx.mongodb.net/event_engine?retryWrites=true&w=majority`

> The free M0 tier has **no automatic backups**. See section 7.

## 3. Create the Vercel project

1. Sign in at <https://vercel.com> with your GitHub account.
2. **Add New > Project**, import the `event-engine` repository.
3. Leave **Root Directory** as the repository root. Vercel reads
   `vercel.json` for the install/build commands, output folder, the `/api`
   function and the security headers. Framework preset: **Other**.
4. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `MONGODB_URI` | the Atlas connection string from step 2 |
   | `SESSION_SECRET` | a long random string (see below) |
   | `CLIENT_ORIGINS` | `https://<your-project>.vercel.app` |
   | `APP_URL` | `https://<your-project>.vercel.app` |
   | `TRUST_PROXY` | `1` |
   | `COOKIE_SAMESITE` | `lax` |
   | `APP_TIME_ZONE` | `Asia/Kolkata` |

   Generate `SESSION_SECRET` with:
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

   Optional email (registration confirmations): `SMTP_HOST`, `SMTP_PORT`,
   `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. Leave them out to run
   without email.

5. Click **Deploy**.

## 4. Turn on image uploads (Vercel Blob)

1. In the Vercel project: **Storage > Create > Blob**, connect it to the project.
   This adds `BLOB_READ_WRITE_TOKEN` automatically.
2. **Deployments > … > Redeploy** so the new variable takes effect.

Without a Blob store, uploads show "Image uploads are not configured" and
everything else keeps working.

## 5. Create your admin account

Run this **on your own computer**, pointed at the production database. The
password never goes to Vercel.

PowerShell (from the `backend` folder):

```powershell
$env:MONGODB_URI = "<Atlas connection string>"
$env:SUPER_ADMIN_EMAIL = "<your email>"
$env:SUPER_ADMIN_PASSWORD = "<a long unique password>"
npm run create-admin
Remove-Item Env:MONGODB_URI, Env:SUPER_ADMIN_EMAIL, Env:SUPER_ADMIN_PASSWORD
```

Then sign in on the live site. You'll see the admin Dashboard.

**Do not run `npm run seed` against production.** It deletes all events.

## 6. Check it works

- `https://<your-project>.vercel.app/api/health` should return `{"status":"ok","db":"up"}`.
- Sign up as a student in a private window, add your PRN on the Profile page,
  register for an event, open **My tickets > Show QR**.
- As admin, open an event's **Open scanner** on your phone (the camera works
  because Vercel serves HTTPS) and scan the ticket.

## 7. Operations

**Backups.** Atlas M0 has no automated backups. Options:
- Upgrade the cluster to M10+ (paid) and enable Cloud Backup, or
- Run a manual backup regularly with MongoDB Database Tools:
  `mongodump --uri "<Atlas connection string>" --out ./backup-YYYY-MM-DD`
  and keep the folder somewhere private. It contains student data, so never
  commit it or upload it to a public place.
- Restore with `mongorestore --uri "<connection string>" ./backup-YYYY-MM-DD`.

**Monitoring.** Vercel **Logs** show API errors (bodies and passwords are never
logged). Add a free uptime monitor (e.g. UptimeRobot) on `/api/health`.

**Rolling back.** Vercel **Deployments** keeps every version; use
**Instant Rollback** on a known-good deployment.

**Custom domain.** **Settings > Domains**. After adding one, update
`CLIENT_ORIGINS` and `APP_URL` to the new domain and redeploy.

**Rotating secrets.** Changing `SESSION_SECRET` signs everyone out. Change the
Atlas password in Atlas, then update `MONGODB_URI` in Vercel and redeploy.

## Plan limits worth knowing

- **Vercel Hobby** (free) is for personal, non-commercial projects: fine for a
  portfolio or a student-run pilot. If a university or organisation adopts the
  platform officially, Vercel's terms require the **Pro** plan.
- **Atlas M0**: 512 MB storage and a shared CPU. Plenty for a pilot.
- Serverless functions are limited to 4.5 MB request bodies. Image uploads
  are capped at 2 MB, well inside that.

## How production differs from local development

| | Local | Vercel |
|---|---|---|
| API | `npm run dev` in `backend` (port 5000) | `api/index.js` serverless function |
| Frontend → API | Vite dev server proxies `/api` | same domain |
| Sessions | MongoDB (`sessions` collection) | same |
| Rate limits | in memory | MongoDB (`ratelimits` collection), shared by all instances |
| Images | `backend/uploads/` | Vercel Blob |
| Emails | sent in the background | sent in the background via `waitUntil` |

To rehearse the production setup locally, build the client and run
`npx vite preview` in `client`: it applies the same security headers as
`vercel.json` and proxies `/api` to `API_PROXY_TARGET` (default
`http://localhost:5000`).
