# Clarity — Technology Stack & Architecture

This document provides a comprehensive overview of all technologies, libraries, frameworks, databases, and deployment platforms used in the Clarity Intelligent Document Assistant project.

---

## 1. High-Level Architecture Overview

```
                      +---------------------------------------+
                      |               Browser                 |
                      |   React + Vite + PDF.js (Client)      |
                      +-------------------+-------------------+
                                          |
                        HTTP / REST APIs  |  (Credentials: Cookies)
                                          v
                      +-------------------+-------------------+
                      |         Node.js + Express API         |
                      |  - Session / Auth Middleware (Crypto) |
                      |  - QA & Document Prompting            |
                      +---------+-------------------+---------+
                                |                   |
               PostgreSQL Pool  |                   |  HTTPS Requests
            (Neon / Managed DB) |                   |  (Bearer Auth)
                                v                   v
                     +----------+----+     +--------+--------+
                     |  PostgreSQL   |     |   OpenAI API    |
                     | Users & Auth  |     |   gpt-4o-mini   |
                     | Sessions      |     +-----------------+
                     +---------------+
```

---

## 2. Technology Stack Breakdown

### Frontend (Client-Side)

| Category | Technology | Details |
| :--- | :--- | :--- |
| **UI Framework** | [React](https://react.dev/) | Component-driven architecture using functional components and hooks (`useState`, `useEffect`, `useMemo`, `useRef`). |
| **Bundler & Build Tool** | [Vite](https://vitejs.dev/) | Modern, fast development server and production bundler with `@vitejs/plugin-react`. |
| **Styling** | Vanilla CSS | Custom design system (`client/public/src/style.css`) with CSS custom properties (variables), responsive layout, dark/light tones, glassmorphism, and micro-interactions. |
| **Icons** | [Lucide React](https://lucide.dev/) | Tree-shakeable SVG icons for navigation, file types, document stats, and controls. |
| **PDF Extraction** | [PDF.js (Mozilla)](https://mozilla.github.io/pdf.js/) | Dynamically imported via CDN (`cdnjs`) to extract text from PDF files directly in the browser without server overhead. |
| **File Formats Supported** | Native Web APIs | Supports `PDF`, `TXT`, `Markdown (.md)`, `CSV`, and `JSON` via HTML5 File and FileReader APIs. |
| **Offline Heuristic QA** | Heuristic Algorithm | Client-side keyword and pattern-matching engine (`localAnswer` in `App.jsx`) providing fallback question-answering when offline or without an AI API key. |

---

### Backend (Server-Side)

| Category | Technology | Details |
| :--- | :--- | :--- |
| **Runtime Environment** | [Node.js](https://nodejs.org/) | Built using ECMAScript Modules (`"type": "module"`). Minimum recommended version: Node 18+. |
| **Web Framework** | [Express.js](https://expressjs.com/) | RESTful API server handling authentication routes and document question-answering endpoints. |
| **CORS Middleware** | [`cors`](https://www.npmjs.com/package/cors) | Configured with dynamic origin whitelist support and credential passing (`credentials: true`). |
| **Environment Config** | [`dotenv`](https://www.npmjs.com/package/dotenv) | Loads environment configurations (`PORT`, `CORS_ORIGIN`, `DATABASE_URL`, `OPENAI_API_KEY`, etc.) from `.env`. |
| **Password Hashing** | Node.js `crypto.scrypt` | Passwords hashed using `scrypt` with per-user unique random salts (16 bytes). |
| **Session Security** | SHA-256 + HTTP-only Cookies | Random 32-byte base64url tokens, stored as SHA-256 hashes in database or memory. Sent via HTTP-only, `SameSite` secure cookies. |
| **Timing Attack Mitigation** | Node.js `crypto.timingSafeEqual` | Constant-time buffer comparison to prevent timing attacks during password verification. |

---

### Database & Persistence

| Mode | Technology | Details |
| :--- | :--- | :--- |
| **Production Database** | [PostgreSQL](https://www.postgresql.org/) via [`pg`](https://node-postgres.com/) | Connection pooled (`Pool`) schema supporting `users` and `sessions` tables with foreign keys and automatic session cleanup. Ideal for managed platforms like [Neon](https://neon.tech). |
| **Development Fallback** | Local File (`server/users.json`) & Memory | Development fallback storing user records in local JSON with file permission protection (`0o600`) and sessions in an in-memory `Map`. |
| **Database Migrations** | `server/migrateUsers.js` | Idempotent migration script transferring local JSON accounts to PostgreSQL without duplicate conflicts (`ON CONFLICT DO NOTHING`). |

---

### AI & LLM Integration

| Component | Technology | Details |
| :--- | :--- | :--- |
| **Model** | `gpt-4o-mini` (configurable) | Default model for grounded document question-answering and source excerpt citations. |
| **API Provider** | OpenAI Chat Completions API | Standard OpenAI REST endpoint with customizable `OPENAI_BASE_URL` and `OPENAI_MODEL` to support compatible alternative providers. |
| **Citation System** | In-prompt source grounding | Strict system prompts prompting the model to cite numbered excerpts `[1]`, `[2]`, mapped back to document excerpts for transparency. |

---

### Deployment & DevOps

| Component | Platform | Configuration File |
| :--- | :--- | :--- |
| **Frontend Hosting** | [Vercel](https://vercel.com/) | [`vercel.json`](../vercel.json) — Static SPA deployment from the `dist/` directory generated by Vite. |
| **Backend Hosting** | [Render](https://render.com/) | [`render.yaml`](../render.yaml) — Web service configuration with health-check monitoring at `/api/health`. |
| **Managed Database** | [Neon](https://neon.tech) / PostgreSQL | External managed serverless PostgreSQL database with SSL connection support. |

---

## 3. Directory & File Reference Map

```
intelligent-document-assistant/
├── client/
│   └── public/
│       ├── index.html          # Main HTML entry point
│       └── src/
│           ├── main.jsx        # React root bootstrapping
│           ├── App.jsx         # Main application UI, document viewer & local QA
│           ├── Auth.jsx        # User authentication modals & forms
│           ├── api.js          # Fetch wrapper with credentials and API base URL
│           └── style.css       # Complete vanilla CSS styling & design tokens
├── server/
│   ├── index.js                # Express entry point & /api/ask OpenAI route
│   ├── auth.js                 # Authentication routes, scrypt hashing & cookies
│   ├── db.js                   # PostgreSQL connection pool & queries
│   ├── migrateUsers.js         # JSON to PostgreSQL migration utility
│   └── users.json              # Local development user store (git-ignored)
├── tech-stack/
│   └── README.md               # This technology stack reference document
├── .env.example                # Example environment variables template
├── package.json                # Project dependencies and npm scripts
├── render.yaml                 # Render blueprint deployment specification
├── vercel.json                 # Vercel build & routing configuration
└── vite.config.js              # Vite configuration and backend API proxy
```
