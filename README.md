# Clarity — Intelligent Document Assistant

A document workspace with email/password accounts, file uploads, searchable documents, and grounded document chat with source excerpts and downloadable notes.

## Run locally

1. Install Node.js 18 or newer.
2. Run `npm install` from the project root.
3. Start the API with `npm run server`.
4. In a second terminal, run `npm run dev` and open the address Vite prints (usually http://localhost:5173).

Accounts are stored in `server/users.json`; passwords are salted and hashed with scrypt. Sign-in uses HTTP-only cookies that expire after seven days. Sessions are held in server memory, so an API restart signs users out. The local document assistant works without an AI API key. To enable richer AI answers, copy `.env.example` to `.env`, set `OPENAI_API_KEY`, and restart the API server. `OPENAI_MODEL` and `OPENAI_BASE_URL` can be changed for compatible providers.

## Supported uploads

PDF, TXT, Markdown, CSV, and JSON. PDF text extraction uses PDF.js from a CDN, so PDF uploads need an internet connection. Uploaded files currently stay in browser memory for the current session and are not yet stored per account. When the optional AI API is enabled, document text is sent to that provider to generate answers.

## Production build

Run `npm run build`; the built client is written to `dist/`.

## Vercel + Render deployment preparation

The repository includes a Vercel build configuration (`vercel.json`) and a Render web service blueprint (`render.yaml`). Both services use the repository root and the root `package-lock.json`.

### Vercel frontend

- Root directory: repository root (`.`)
- Framework preset: Vite
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL` = the deployed Render API origin, with no trailing slash (for example, the actual `https://<service>.onrender.com` URL after Render creates it)

`VITE_API_URL` is public and is embedded in browser JavaScript. Never put API keys or other secrets in a `VITE_` variable.

### Render backend

- Root directory: repository root (`.`)
- Runtime: Node
- Build command: `npm ci`
- Start command: `npm run server`
- Health check path: `/api/health`
- Required environment variable: `CORS_ORIGIN` = the exact deployed Vercel origin (for example, `https://<project>.vercel.app`, without a trailing slash)
- Set `NODE_ENV=production` (the included `render.yaml` does this)
- Optional server-only variables: `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_BASE_URL`
- Required server-only variable: `DATABASE_URL` = the managed PostgreSQL connection string

Render supplies `PORT`; the Express server binds to `0.0.0.0`. Do not put secrets in this repository. Add any AI key only in Render's environment settings.

### Account data migration

With `DATABASE_URL` configured, the backend stores accounts and hashed session tokens in PostgreSQL. In local development without `DATABASE_URL`, it continues using `server/users.json` and in-memory sessions.

The existing local account file is ignored by Git. Neon is the recommended database for a free-tier setup; its current Free plan lists 1 GB of storage per project. Limits can change, so review the provider's current plan before relying on it for important data. [Neon Free plan update](https://neon.com/blog/neon-free-plan-1-gb-per-project)

To migrate, create a PostgreSQL project, put its SSL-enabled connection string in your local `.env` as `DATABASE_URL`, and run `npm run migrate:users` once. This sends account names, email addresses, and existing password hashes to the database named by that URL. The importer is idempotent: existing rows are skipped, and the local JSON file is not modified. Add the same database URL to Render's server-only environment settings. Do not put it in Vercel or in any `VITE_` variable. Do not deploy the production backend until the import has completed and been verified.

The included Render web service uses its free plan and can spin down when idle. Render's free Postgres databases expire after 30 days, so the deployment uses a separate managed PostgreSQL provider instead. [Render free plan limitations](https://render.com/docs/free)
