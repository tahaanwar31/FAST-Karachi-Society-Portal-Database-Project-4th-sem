# FAST Clusters — Society Management Portal

<div align="center">

**A full-stack web application to digitize and streamline society management at FAST NUCES Karachi.**

**Live Demo:** [fast-karachi-society-portal-database.onrender.com](https://fast-karachi-society-portal-database.onrender.com/)

[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![Express](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

</div>

---

## The Problem

At FAST NUCES Karachi, **20+ student societies** operate with zero digital infrastructure. Everything runs on WhatsApp groups and Google Forms:

- **Students** have no central place to discover events or track their participation
- **Society heads** manage events through scattered spreadsheets with no approval workflow
- **University admin** has zero visibility into what events are happening, who's attending, or which societies are active
- **Event registration** is manual — Google Forms that overflow, WhatsApp forwards that get lost, no capacity tracking
- **No accountability** — no record of which society organized what, how many students participated, or which events were approved

This leads to scheduling conflicts, unapproved events, poor attendance tracking, and a fractured student experience.

## The Solution

**FAST Clusters** is a role-based society management portal that brings the entire ecosystem onto one platform:

| Role | Capabilities |
|------|-------------|
| **Students** | Browse events, register/unregister, give feedback on attended events, track participation |
| **Society Heads** | Create events, manage participants, mark attendance, request event edits/deletions (admin-approved), view feedback |
| **Admin** | Approve/reject events & change requests, manage societies, venues, assign heads & co-heads, inspect database, run SQL queries |

### Event Approval Workflow

```
Society Head creates event → Status: PENDING
                              ↓
Admin reviews & approves  → Status: PUBLISHED → Visible to all students
Admin rejects             → Status: CANCELLED → Removed from listings
```

### Event Change Request Workflow

```
Society Head requests UPDATE/DELETE → Status: PENDING
                                      ↓
Admin approves (UPDATE)            → Changes applied to event
Admin approves (DELETE)            → Event removed
Admin rejects (with reason)        → Society head notified with reason
```

Every event goes through admin approval before students can see or register for it.

---

## Features

### For Students
- Browse all approved upcoming events with real-time countdown timers
- One-click event registration with capacity tracking
- Unregister from events before they start
- Give feedback (1-5 star rating + comments) on attended events
- Personal dashboard showing registrations, attended events, and feedback status
- Search events by name or society

### For Society Heads
- Create new event proposals (title, description, date, time, venue, capacity)
- Track registration counts and capacity utilization per event
- View participant list per event with attendance tracking
- Mark participants as Present/Absent
- View feedback received on events (ratings & comments)
- Request event edits or deletion (goes through admin approval)
- Receive notifications when admin approves/rejects change requests
- Visual progress bars showing fill rate
- Events remain pending until admin approval

### For Admin
- **Dashboard** with real-time stats (societies, users, events, registrations)
- **Event approval queue** — approve or reject pending events
- **Event change requests** — review and approve/reject society head UPDATE/DELETE requests with reason
- **Society management** — create societies, assign heads & co-heads, delete societies
- **Venue management** — add venues, toggle availability (YES/NO), enforce on event creation
- **User management** — view all admins, heads, co-heads, and student members
- **SQL Console** — run raw SQL queries against the database
- **Database Inspector** — browse all tables and records visually
- **Published events overview** with participant lists

### Technical Features
- Responsive design with mobile navigation
- Cookie-based authentication with role-based access control
- Dual database support (PostgreSQL for production, SQLite for local dev)
- Real-time countdown timers on event cards
- Animated transitions with Framer Motion
- Role-based table registry (admins, heads, co-heads, student members)
- 14 foreign key relationships with proper ON DELETE behaviors (CASCADE, SET NULL, RESTRICT)
- 12 CHECK constraints for data integrity (roles, statuses, ratings, capacities)
- 8 UNIQUE constraints (emails, society names, composite registration/feedback)
- Venue availability enforcement — unavailable venues rejected on event creation
- Event capacity cannot exceed venue capacity
- Server-side capacity enforcement on registration

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, React Router v7, Framer Motion, Lucide Icons |
| **Styling** | Tailwind CSS v4, custom glass-morphism design system |
| **Backend** | Express.js, TypeScript |
| **Database** | PostgreSQL (Neon Serverless), with SQLite fallback |
| **Build Tool** | Vite 6 |
| **Authentication** | Cookie-based with HTTP-only cookies |

---

## Project Structure

```
├── server.ts              # Express backend (DB, API, Vite middleware)
├── src/
│   ├── App.tsx            # Root component with routing
│   ├── types.ts           # TypeScript type definitions
│   ├── index.css          # Design system & Tailwind config
│   ├── components/
│   │   ├── AuthContext.tsx # Auth state management
│   │   ├── Navigation.tsx # Responsive navbar with mobile drawer
│   │   └── EventCard.tsx  # Reusable event card with countdown
│   └── pages/
│       ├── Landing.tsx    # Public landing page
│       ├── Login.tsx      # Login with demo accounts
│       ├── Dashboard.tsx  # Role-based dashboard router
│       ├── AdminDashboard.tsx
│       ├── SocietyHeadDashboard.tsx
│       └── StudentDashboard.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (or use Neon free tier)

### Setup

```bash
# Clone the repository
git clone https://github.com/tahaanwar31/FAST-Karachi-Society-Portal-Database-Project-4th-sem.git
cd FAST-Karachi-Society-Portal-Database-Project-4th-sem

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your DATABASE_URL to .env

# Start development server
npm run dev
```

The app runs at `http://localhost:3000`. It auto-seeds sample data on first run.

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nu.edu.pk | admin123 |
| Society Head (Procom) | headprocom@nu.edu.pk | pass123 |
| Society Head (ACES) | headaces@nu.edu.pk | pass123 |
| Student (Taha) | taha@nu.edu.pk | student123 |
| Student (Ali) | ali.raza@nu.edu.pk | student123 |

---

## Database Schema

11 tables with seed data:

- **users** — Unified auth table for all roles
- **societies** — Society details with head/co-head assignments, status, and admin tracking
- **events** — Event proposals with approval status and venue assignment
- **registrations** — Student-event registrations with attendance status
- **venues** — Campus locations with capacity and availability (YES/NO)
- **admins** — Dedicated admin records with access levels
- **heads** — Society head records with tenure tracking
- **co_heads** — Co-head records per society
- **student_members** — Student membership records with semester/department info
- **feedback** — Student event feedback with 1-5 rating and comments
- **event_requests** — Society head UPDATE/DELETE requests with admin approval workflow

### Integrity Constraints

- **14 Foreign Keys** — Users, societies, events, registrations, feedback, and event_requests all properly linked
- **12 CHECK Constraints** — Roles (ADMIN/SOCIETY_HEAD/STUDENT), statuses, availability (YES/NO), ratings (1-5), request types, etc.
- **8 UNIQUE Constraints** — Emails, society names, composite (user_id + event_id) for registrations and feedback
- **ON DELETE CASCADE** — Registrations, feedback, and event_requests removed when parent event/user is deleted
- **ON DELETE SET NULL** — Head assignments cleared when user is deleted
- **ON DELETE RESTRICT** — Venue cannot be deleted if events reference it

---

## Deployment

### Production Build
```bash
npm run build    # Builds React frontend to dist/
npm start        # Starts Express server in production mode
```

### Deploy to Render
1. Push to GitHub
2. Connect repo on [render.com](https://render.com)
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`
5. Add `DATABASE_URL` environment variable

---

## Team

| | Name | Role |
|--|------|------|
| 👤 | **Taha Anwar** | Lead Developer — Full-stack architecture, database design, API development, UI/UX |
| 👤 | **Hamza Atif** | Co-Developer — Testing, system analysis, feature planning |

---

<div align="center">

**FAST NUCES Karachi — 4th Semester Database Project**

</div>
