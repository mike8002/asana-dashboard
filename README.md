# Project Hub — Asana Dashboard

A dark-themed Next.js dashboard for tracking Asana tasks, team workload, project progress, and time tracking. Protected behind Google sign-in.

## What you get

- **4 scorecards**: Total tasks, completed, overdue, hours logged
- **Pie chart**: Task status breakdown
- **Bar charts**: Tasks per team member, hours logged per member
- **Progress bars**: Project completion percentages
- **Detail table**: Full task list with status badges, filterable by team member
- **Google sign-in**: Only authorised users can access the dashboard
- **Auto-refresh**: Data updates every 5 minutes

---

## Setup (step by step)

### 1. Prerequisites

You need these installed on your computer:
- **Node.js** (v18+): Download from https://nodejs.org
- **Git**: Download from https://git-scm.com

To check if you have them, open Terminal and type:
```
node --version
git --version
```

### 2. Create a GitHub repository

1. Go to https://github.com → click **New repository**
2. Name it `asana-dashboard`, set to **Private**, click **Create**
3. Keep this page open — you'll need the URL shortly

### 3. Set up the project locally

```bash
# Navigate to where you want the project
cd ~/Desktop

# Unzip the project (if downloaded as zip)
# Or copy the asana-dashboard folder here

# Go into the project
cd asana-dashboard

# Install dependencies
npm install

# Copy the env template
cp .env.example .env.local
```

### 4. Get your Asana token

You already have this from the Google Sheets setup:
1. Go to https://app.asana.com/0/my-apps
2. Under **Personal Access Tokens**, create a new token (or reuse the existing one)
3. Paste it into `.env.local` as `ASANA_TOKEN`

### 5. Set up Google sign-in

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Under **Authorised redirect URIs**, add:
   - `http://localhost:3000/api/auth/callback/google` (for local dev)
   - `https://your-app.vercel.app/api/auth/callback/google` (add later after deploying)
7. Copy the **Client ID** and **Client Secret** into `.env.local`

### 6. Generate NextAuth secret

In Terminal, run:
```bash
openssl rand -base64 32
```
Copy the output and paste it as `NEXTAUTH_SECRET` in `.env.local`.

### 7. Test locally

```bash
npm run dev
```
Open http://localhost:3000 — you should see the login page.

### 8. Push to GitHub

```bash
git init
git add .
git commit -m "Initial dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/asana-dashboard.git
git push -u origin main
```

### 9. Deploy to Vercel

1. Go to https://vercel.com → **Add New Project**
2. Import your GitHub repository
3. Under **Environment Variables**, add ALL the values from your `.env.local`:
   - `ASANA_TOKEN`
   - `ASANA_WORKSPACE_GID`
   - `ASANA_PROJECT_GIDS`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` → set this to `https://your-app.vercel.app`
4. Click **Deploy**
5. After deploy, go back to Google Cloud Console and add your Vercel URL to the OAuth redirect URIs

### 10. Restrict access (optional)

To only allow team emails (e.g., @umww.com), uncomment the `signIn` callback in:
`app/api/auth/[...nextauth]/route.js`

---

## Adding more projects

Edit `.env.local` (or Vercel environment variables):
```
ASANA_PROJECT_GIDS=1213523346795620,9876543210987654
```
Comma-separated, no spaces.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Not Authorized" from Asana | Check your token is correct in `.env.local` |
| Google login fails | Check redirect URIs match exactly |
| No time tracking data | Requires Asana Business or Enterprise plan |
| Data seems stale | Hard refresh (Ctrl+Shift+R) — data caches for 5 min |
