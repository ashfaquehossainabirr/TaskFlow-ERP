# TaskFlow ERP — Project, CRM, Finance & HR System

A full-stack ERP built with **React (Vite)**, **Express**, and **MongoDB**, extended from the original
TaskFlow task manager into a lightweight ERP for IT agencies and small software companies.

## Core (original TaskFlow)

- Role-based auth (**Admin / Manager / Employee**) with JWT
- Admin dashboard: create users, create & assign tasks, edit/delete anything
- **Manager role**: fully manage tasks for their own reports (create, assign, edit, delete, view team stats) — but no access to user management or projects
- Employee dashboard: see assigned tasks, update task status
- **Projects & Milestones**: tasks belong to real Project records, each with its own milestones
- **Kanban board**: drag-and-drop cards between status columns
- **Calendar view**: task deadlines and project milestones plotted by day
- **Comments & activity log**: every task has a unified timeline of system events (created, status changes, edits) plus threaded comments
- **Live time tracking**: start/stop a timer on any task; it keeps running and stays visible in the sidebar across every page, even after a refresh
- Task statuses: `todo`, `in-progress`, `delivered`, `cancelled`, `hold`
- **Task Completion donut chart**: pending vs. completed tasks at a glance on the Overview page, with a total-task count underneath
- Every task shows **days remaining** until its deadline
- **Deadline Watch**: a dedicated view (and overview widget) listing every open task
  with **3 days or fewer** remaining
- **Daily email reminders**: every employee with an approaching deadline gets an automated email at 10am
- **Dark / light mode**: toggle in the sidebar (and on the login screen), remembers your choice, and defaults to your OS preference on first visit
- **Notice Board**: company-wide announcements on the Overview page, visible to everyone; admins can post/delete any notice, managers can post and delete their own (with priority levels and pinning)
- Responsive UI (mobile sidebar drawer, scrollable tables) with hover/press feedback on every button

## ERP modules

**CRM** (admin + manager)
- **Leads**: pipeline with source, status (new → contacted → qualified → proposal → won/lost), estimated deal value, and assignment. One click converts a won lead into a Client record.
- **Clients**: company/contact directory with a detail page showing every invoice raised to that client.

**Finance** (admin only)
- **Invoices**: multi-line-item invoices against a client (optionally linked to a Project), with tax %, discount, auto-computed subtotal/tax/total, status (draft/sent/paid/overdue/cancelled), auto-generated invoice numbers (`INV-2026-0001`…), and a one-click "mark paid".
- **Expenses**: categorized company spending (software, salaries, rent, contractors, etc.) with monthly totals.

**HR & Payroll**
- Employee profiles (in **Team & Access**) now carry **designation, phone, employment type, date of joining, and monthly salary**.
- **Attendance** (admin + manager): mark daily present/absent/half-day/leave/holiday for your team, with a "mark all present" shortcut and a same-day summary.
- **Payroll** (admin only): generate a draft payslip for every active employee with a salary set, for any given month; edit allowances/bonus/deductions per employee; mark as paid.

**Overview dashboard**: admins and managers see a **Business Snapshot** — open leads, active clients, and (admin-only) outstanding invoices, revenue this month, and expenses this month — alongside the existing task stats.

---

## 1. Prerequisites

- Node.js 18+
- A MongoDB database — either:
  - Local MongoDB (`mongod` running on `mongodb://127.0.0.1:27017`), or
  - A free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a connection string)

## 2. Backend setup

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
- `MONGO_URI` — your MongoDB connection string
- `JWT_SECRET` — replace with a long random string
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — credentials for the first admin account

Install and run:

```bash
npm install
npm run seed   # creates the first admin account from your .env values
npm run dev    # starts the API on http://localhost:5000 (nodemon, auto-restarts)
# or: npm start
```

**If you're upgrading an existing database** (one that already has tasks created before Projects & Milestones existed), run this once to convert old free-text project names into real Project records:
```bash
npm run migrate:projects
```
This is safe to run more than once — it skips anything already migrated.

Health check: `GET http://localhost:5000/api/health`

## 3. Frontend setup

In a second terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev    # starts the app on http://localhost:5173
```

`VITE_API_URL` in `frontend/.env` should point at your backend (default `http://localhost:5000/api`).

## 4. Log in

Open `http://localhost:5173`, and log in with the admin account created by `npm run seed`
(defaults: `admin@taskflow.com` / `Admin@12345` unless you changed `.env`).

From the **Team & Access** page, the admin can create employee accounts (and set their designation,
salary, and joining date for payroll). Employees log in with those credentials and only see the tasks
assigned to them.

---

## How it's organized

```
backend/
  models/User.js        # admin/manager/employee accounts, hashed passwords, HR fields
  models/Task.js         # tasks with status, deadline, assignment, history
  models/Project.js      # projects & milestones
  models/Lead.js          # CRM: sales pipeline
  models/Client.js        # CRM: client directory
  models/Invoice.js       # Finance: invoices with line items
  models/Expense.js       # Finance: company expenses
  models/Attendance.js    # HR: daily attendance records
  models/Payroll.js       # HR: monthly payslips
  routes/auth.js          # POST /login, GET /me
  routes/users.js         # admin-only user CRUD (now includes HR fields)
  routes/tasks.js         # task CRUD, stats, upcoming-deadlines
  routes/leads.js         # CRM leads CRUD + convert-to-client
  routes/clients.js       # CRM clients CRUD
  routes/invoices.js      # Finance invoices CRUD + stats + mark-paid
  routes/expenses.js      # Finance expenses CRUD + stats
  routes/attendance.js    # HR attendance mark/bulk-mark/list
  routes/payroll.js       # HR payroll generate/edit/mark-paid
  routes/dashboard.js     # cross-module Overview snapshot
  middleware/auth.js      # JWT verification + role guard
  seed.js                 # creates the first admin account

frontend/
  src/pages/Login.jsx
  src/pages/Overview.jsx        # dashboard: task stats + Business Snapshot
  src/pages/Tasks.jsx           # full task list, create/edit/assign (admin), status update (all)
  src/pages/DeadlineWatch.jsx   # tasks due in <= 3 days
  src/pages/Users.jsx           # admin-only user management (+ HR fields)
  src/pages/Leads.jsx           # CRM pipeline
  src/pages/Clients.jsx         # CRM client directory
  src/pages/ClientDetail.jsx    # single client + its invoices
  src/pages/Invoices.jsx        # Finance: invoices
  src/pages/Expenses.jsx        # Finance: expenses
  src/pages/Attendance.jsx      # HR: daily attendance
  src/pages/Payroll.jsx         # HR: monthly payroll
  src/context/AuthContext.jsx   # login state, token storage
  src/components/               # shared UI: task table, forms, badges, deadline chips
  src/erp/badges.js             # shared status/label maps for the ERP modules
```

## Permissions summary

| Action                          | Admin | Manager | Employee |
|----------------------------------|:-----:|:-------:|:--------:|
| Log in                           | ✅    | ✅      | ✅       |
| View own assigned tasks          | ✅    | ✅      | ✅       |
| View all tasks / their team's tasks | ✅ (all) | ✅ (own team) | ❌ |
| Create / assign tasks            | ✅    | ✅ (own team only) | ❌ |
| Edit task details / reassign     | ✅    | ✅ (own team only) | ❌ |
| Update status of own tasks       | ✅    | ✅      | ✅       |
| Delete tasks                     | ✅    | ✅ (own team only) | ❌ |
| View team stats / Employee Stats | ✅ (everyone) | ✅ (own team) | ❌ |
| Create / manage projects & milestones | ✅ | ❌ | ❌ |
| Create / edit / delete users     | ✅    | ❌      | ❌       |
| Manage leads & clients (CRM)     | ✅    | ✅      | ❌       |
| Manage invoices & expenses (Finance) | ✅ | ❌  | ❌       |
| Mark / view team attendance (HR) | ✅    | ✅ (own team) | ❌  |
| Generate & manage payroll        | ✅    | ❌      | ❌       |

## Notes

- Passwords are hashed with bcrypt; never stored in plain text.
- JWTs are stored in `localStorage` on the client and sent as a `Bearer` token.
- Deleting a user who still has tasks assigned is blocked — reassign or delete their tasks first.
- Deleting a client with invoices on record is blocked — delete those invoices first.
- Invoice numbers auto-increment per year (`INV-2026-0001`, `INV-2026-0002`, …).
- Payroll generation reads each employee's `monthlySalary` field (set from **Team & Access**) — employees
  without a salary set are skipped, and running it twice for the same month won't duplicate existing payslips.
- The ERP write paths intentionally avoid MongoDB multi-document transactions, so everything works against
  a plain standalone `mongod`, not just Atlas or a replica set.
- Deployed separately? Set `CLIENT_URL` in the backend `.env` to your deployed frontend origin
  (comma-separate multiple origins) so CORS allows it.

