# Iposi

A fast, dark-themed HTTP client for building, sending and organising API
requests from the browser — a personal alternative to heavyweight desktop API
tools.

**Live:** <https://yusa.app/iposi>

The name comes from the Zulu word for *postman*.

---

## Features

- **Multi-tab workspace** — open many requests side by side; create, close,
  rename (double-click) and drag-reorder tabs. Each tab keeps its own method,
  URL, params, headers, body and last response, so you can switch freely
  without losing state.
- **Methods** — GET, POST, PUT, PATCH, DELETE, colour-coded throughout.
- **Query params** — a key/value grid that keeps the URL's query string in sync
  as you type.
- **Headers** — arbitrary custom request headers.
- **Request body** — `none`, `x-www-form-urlencoded`, or `raw` with a
  syntax-highlighting editor (JSON, Text, HTML, XML, JavaScript), per-type
  starter templates, and one-click JSON **Beautify**.
- **Response viewer** — status badge coloured by code range, response time,
  payload size, pretty-printed body, and the full response header list.
- **History** — every request you send is saved. The sidebar lists them; click
  one to reopen it in a new tab, or delete it. A **Save To History** switch
  lets you send without recording.
- **Local API testing** — requests to `localhost` / `127.0.0.1` are routed
  through the companion **IposiAgent** desktop app so a browser-hosted client
  can still reach services on your machine. Everything else goes through the
  server-side proxy, which sidesteps CORS.
- **Accounts** — username / password with a persistent "remember me" option,
  and a lightweight captcha on sign-up.

---

## Tech stack

| Part          | Stack                                                              |
| ------------- | ----------------------------------------------------------------- |
| `client/`     | React 18, Vite, TypeScript, Zustand, CodeMirror 6, lucide-react  |
| `server/`     | Node, Express, TypeScript, `mssql`, JWT auth                     |
| Database      | Microsoft SQL Server (`users`, `user_tokens`, `api_history`)     |
| Local agent   | IposiAgent — a small tray app that proxies `localhost` requests  |

```
browser ─► React SPA  ──►  Express API  ──►  SQL Server
                │
                └─► IposiAgent (127.0.0.1:19090)  ──►  your local services
```

---

## Project structure

```
.
├── client/                     React + Vite front-end
│   └── src/
│       ├── components/login/        flip-card login / register
│       ├── components/workspace/    sidebar, tab bar, request & response panels, editor
│       ├── store/                   Zustand stores (auth, tabs, history, popup, ui)
│       └── lib/                     API client, send logic, formatting, captcha
├── server/                     Express API
│   └── src/
│       ├── routes/auth.ts           /api/auth/{me,register,login,logout}
│       ├── routes/history.ts        /api/history  (list / get / delete / save)
│       ├── routes/request.ts        /api/request  (outbound HTTP proxy)
│       ├── auth.ts                  password hashing, JWT session, remember-me tokens
│       └── db.ts                    SQL Server connection pool
├── DEPLOYMENT.md               nginx + systemd deployment guide
└── README.md
```

---

## Getting started

Requirements: Node 20+ and a reachable SQL Server instance with the `users`,
`user_tokens` and `api_history` tables.

```bash
# 1) API
cd server
npm install
cp .env.example .env          # fill in DB_* and SESSION_SECRET
npm run dev                    # http://127.0.0.1:3001

# 2) Web client (separate terminal)
cd client
npm install
npm run dev                    # http://127.0.0.1:5173  — /api is proxied to :3001
```

To exercise the `localhost` routing path, also run **IposiAgent** (its window
sits in the system tray and listens on port `19090`).

### Configuration

All server configuration is environment variables — see
[`server/.env.example`](server/.env.example) for the full list (SQL Server
host / instance / credentials, `SESSION_SECRET`, cookie flags, CORS origins,
and outbound-proxy timeout / size limits).

---

## Production build

```bash
( cd server && npm ci && npm run build )   # → server/dist
( cd client && npm ci && npm run build )   # → client/dist   (served under /iposi/)
```

The client build is configured to be served from the `/iposi/` sub-path. See
**[DEPLOYMENT.md](DEPLOYMENT.md)** for the full nginx + systemd setup used for
<https://yusa.app/iposi>.

---

## API

All endpoints are under `/api`. Auth is a signed, http-only session cookie;
`GET /api/auth/me` also honours the long-lived "remember me" cookie.

| Method & path              | Purpose                                        |
| -------------------------- | --------------------------------------------- |
| `GET    /api/auth/me`      | current user (session or remember-me cookie)  |
| `POST   /api/auth/register`| create an account                             |
| `POST   /api/auth/login`   | sign in, optionally set a 30-day token        |
| `POST   /api/auth/logout`  | clear session + revoke remember-me token      |
| `GET    /api/history`      | list the current user's saved requests        |
| `GET    /api/history/:id`  | full stored request (to reopen as a tab)      |
| `POST   /api/history`      | save a request (used after a local send)      |
| `DELETE /api/history/:id`  | delete a stored request                       |
| `POST   /api/request`      | run an outbound HTTP request and return it    |
| `GET    /api/health`       | liveness + database connectivity              |

---

## License

MIT — © Yuşa Göverdik
