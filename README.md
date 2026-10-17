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
