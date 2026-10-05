# Daryl's Glass Repair & Windshield Replacement Service CRM

A modern, production-grade Customer Relationship Management (CRM) and work order management system tailored for automotive and residential glass service operations.

---

## 🚀 Architecture & Tech Stack

- **Frontend**: React 18, Tailwind CSS v4, Redux Toolkit, React Router DOM, Lucide Icons, Recharts, Vitest.
- **Backend**: Node.js, Express.js 5, MongoDB / Mongoose ODM, Socket.io, Winston, Jest.
- **Security & Hardening**:
  - `helmet` Content Security Policy, X-Frame-Options (`SAMEORIGIN`), X-Content-Type-Options (`nosniff`).
  - `express-rate-limit` (Global, Auth, and Sensitive Operation limiters).
  - `express-validator` schema validation & sanitization on all endpoints.
  - `xss` HTML tag stripping on user-submitted notes & descriptions.
  - `dompurify` client-side DOM sanitization.
  - Regex ReDoS prevention with input escaping.
  - Double-submit CSRF cookie protection (`/api/csrf-token`).
  - HttpOnly cookies with 7-day JWT expiration & bcrypt password hashing (10 salt rounds).
  - Role-Based Access Control (`roleMiddleware`, `ownerOrAdminMiddleware`).
  - Unified error handling preventing stack trace leakage in production.

---

## 📦 Project Structure

```
CRM/
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI components & layouts
│   │   ├── pages/          # 12 Core CRM pages
│   │   ├── store/          # Redux Toolkit slices (auth, customer, job, invoice, quote, comms)
│   │   ├── services/       # Axios API client with token & CSRF interceptors
│   │   ├── utils/          # Sanitizers, mock domain datasets
│   │   └── hooks/          # useSocket, useAuth custom hooks
│   ├── package.json
│   └── vite.config.js
│
└── backend/
    ├── config/             # Database connection
    ├── controllers/        # REST route handlers with sanitization
    ├── middleware/         # Auth, RBAC, Validation, Rate Limiter, Error Handler
    ├── models/             # Mongoose schemas (User, Customer, Vehicle, Job, Quote, Invoice, etc.)
    ├── routes/             # Express route mappings
    ├── utils/              # Sanitizer & Winston logger
    ├── __tests__/          # Unit & Security Jest test suites
    ├── app.js
    └── server.js
```

---

## 🧪 Testing

### Backend Unit & Security Tests
```bash
cd backend
npm test
```

### Frontend Vitest Suite
```bash
cd frontend
npm test
```

---

## 🚢 Deployment Runbook

### Backend (Render)
1. Link repository to [Render](https://render.com).
2. Create Web Service:
   - Root directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
3. Populate Environment Variables from `backend/.env.production`.

### Frontend (Netlify)
1. Link repository to [Netlify](https://netlify.com).
2. Configuration:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add `VITE_API_URL` and `VITE_SOCKET_URL` pointing to the Render backend.
