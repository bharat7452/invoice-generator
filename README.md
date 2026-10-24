# InvoiceEasy: Invoice Generator for Small Businesses

A full-stack MERN web app that lets small businesses create, track and print professional invoices.

  **Live demo:** https://invoice-generator-oykr.onrender.com

## Features

- Register / log in (password hashing with bcrypt, cookie-based sessions stored in MongoDB)
- Business profile (name, address, phone, GSTIN) printed on every invoice
- Create, edit, view and delete invoices with multiple line items, discount and GST/tax
- Automatic invoice numbers (INV-0001, INV-0002, ...); totals are always calculated on the server
- Status workflow: draft → sent → paid, with automatic **overdue** detection
- Search, filter by status and sort the invoice list
- Dashboard with paid / outstanding / overdue totals and a 6-month revenue chart (MongoDB aggregation)
- Print-friendly invoice view: use **Print / Save PDF** in the browser
- Each user can only see their own invoices

## Tech stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | React 18, React Router, Hooks, Context API, Vite               |
| Backend  | Node.js, Express (routing, middleware, sessions, REST API)     |
| Database | MongoDB with Mongoose (CRUD, indexes, aggregation)             |

## Project structure

```
invoice-generator/
├── server/                 Express API
│   ├── index.js            starts the server and connects to MongoDB
│   ├── app.js              middleware, sessions, routes, serves React build
│   ├── models/             User.js, Invoice.js (Mongoose schemas)
│   ├── routes/             auth.js, invoices.js
│   ├── middleware/auth.js  blocks requests without a session
│   └── test/smoke.js       end-to-end API test
├── client/                 React app (Vite)
│   └── src/                pages/, components/, AuthContext.jsx, api.js
├── render.yaml             one-click Render deployment
└── .env.example
```

## Run it locally

**Prerequisites:** Node.js 18+ and a MongoDB database (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster, or MongoDB installed locally).

```bash
# 1. Install dependencies
npm install
npm --prefix client install

# 2. Configure environment variables
cp .env.example .env
# open .env and set MONGODB_URI and SESSION_SECRET

# 3. Start the API (terminal 1), runs on http://localhost:5000
npm run dev:server

# 4. Start the React app (terminal 2), open http://localhost:5173
npm run dev:client
```

### Run as a single app (production mode)

```bash
npm install
npm run build     # builds the React app into client/dist
npm start         # Express serves the API and the React app at http://localhost:5000
```

### Run the tests

```bash
npm test
```

Starts an in-memory MongoDB and checks auth, invoice CRUD, server-side totals, stats and data isolation between users.

## API overview

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`        | Create account and log in            |
| POST   | `/api/auth/login`           | Log in                               |
| POST   | `/api/auth/logout`          | Log out                              |
| GET    | `/api/auth/me`              | Current user                         |
| PUT    | `/api/auth/profile`         | Update business details              |
| GET    | `/api/invoices`             | List (`q`, `status`, `sort`, `page`) |
| GET    | `/api/invoices/stats`       | Dashboard totals (aggregation)       |
| GET    | `/api/invoices/next-number` | Suggested next invoice number        |
| POST   | `/api/invoices`             | Create invoice                       |
| GET    | `/api/invoices/:id`         | Get one invoice                      |
| PUT    | `/api/invoices/:id`         | Update invoice                       |
| PATCH  | `/api/invoices/:id/status`  | Change status                        |
| DELETE | `/api/invoices/:id`         | Delete invoice                       |

## Deploy (free)

The Express server also serves the built React app, so you only need **one** service plus a database.

1. **Database:** create a free cluster on MongoDB Atlas, add a database user, and under *Network Access* allow `0.0.0.0/0`. Copy the connection string.
2. **Push to GitHub** (public repository).
3. **Render:** New → *Blueprint* (or *Web Service*) → select your repo.
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Environment variables: `NODE_ENV=production`, `MONGODB_URI=<your Atlas string>`, `SESSION_SECRET=<random string>`
4. Open the Render URL, register an account and create an invoice to verify. The free plan sleeps after inactivity, so the first load may take about a minute.

## Security notes

- Passwords are hashed with bcrypt; sessions use httpOnly, `secure` (in production) cookies.
- Invoice queries are always filtered by the logged-in owner.
- Only whitelisted fields are accepted from the client, and totals are recomputed on the server.
- `.env` is git-ignored; never commit real credentials.

## Author

Built as the individual mini project for Full Stack Development – 2.
