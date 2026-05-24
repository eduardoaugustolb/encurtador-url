<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/eduardoaugustolb/encurtador-url/main/public/logo-white.svg">
    <img alt="Bit Link" src="https://raw.githubusercontent.com/eduardoaugustolb/encurtador-url/main/public/logo.svg" height="80">
  </picture>
  <h1>Bit Link</h1>
  <p>Self-hosted URL shortener with real-time analytics</p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#project-structure">Structure</a> •
    <a href="#license">License</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/next.js-000000?style=flat&logo=nextdotjs&logoColor=white" alt="Next.js">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript">
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" alt="PostgreSQL">
    <img src="https://img.shields.io/badge/Redis-FF4438?style=flat&logo=redis&logoColor=white" alt="Redis">
    <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
    <img src="https://img.shields.io/badge/Drizzle-7B3FE4?style=flat&logo=drizzle&logoColor=white" alt="Drizzle ORM">
  </p>
</div>

---

## Overview

**Bit Link** is a fast, self-hosted URL shortener built for a single admin. It features a redirect engine optimized for sub-millisecond responses via Redis caching and a real-time analytics dashboard with interactive charts.

The redirects are imperceptible — every slug resolves through a Redis cache backed by PostgreSQL, with click tracking happening asynchronously so it never blocks the redirect.

---

## Features

### ⚡ Redirect Engine
- Redis-first slug resolution for sub-millisecond redirects
- Automatic fallback to PostgreSQL on cache miss
- Rate-limited (100 req/min per IP)
- Blocks SSRF attacks on destination URLs (private/internal IPs filtered)
- 307 temporary redirects preserve HTTP method semantics

### 🔗 Link Management
- Create short links with auto-generated or custom slugs
- Edit destination URL, title, and toggle active/inactive
- Delete links with cascade cleanup
- Infinite-scroll list with cursor-based pagination
- Immutable slugs — once created, they cannot be changed

### 📊 Analytics Dashboard
- Date range filtering (7d, 30d, 90d, custom)
- Key metrics: total clicks, peak day, peak day clicks
- **Clicks over time** — daily bar chart
- **Top links** — ranked by popularity
- **Top referrers** — traffic source breakdown
- CSV export with injection protection

### 🔒 Security
- JWT-based admin sessions (7-day expiry, HttpOnly, Secure, SameSite=Strict)
- Rate limiting at multiple layers (login: 5/min, API: 60/min, redirect: 100/min)
- CSRF protection via origin/referer validation
- Timing-safe password comparison
- Audit logging for all link mutations

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Database** | PostgreSQL via Drizzle ORM |
| **Cache** | Redis (ioredis) |
| **Auth** | JWT (jose) |
| **UI** | Tailwind CSS v4 + shadcn/ui |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **Data Fetching** | TanStack React Query |
| **Animation** | GSAP |
| **ID Generation** | nanoid |
| **Linting** | Biome |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (package manager)
- PostgreSQL database (e.g., [Neon](https://neon.tech))
- Redis instance (e.g., [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com))

### Environment Variables

```env
DATABASE_URL=           # PostgreSQL connection string
REDIS_URL=              # Redis connection string
ADMIN_PASSWORD=         # Admin login password (min 8 chars)
ADMIN_SECRET=           # JWT signing secret (min 32 chars)
NEXT_PUBLIC_APP_URL=    # e.g., http://localhost:3000
```

### Setup

```bash
# Clone the repository
git clone https://github.com/eduardoaugustolb/encurtador-url.git
cd encurtador-url

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run database migrations
bunx drizzle-kit migrate

# Start development server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to `/admin/login` to access the dashboard.

### Scripts

| Script | Description |
|---|---|
| `bun run dev` | Start development server |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run lint` | Lint codebase with Biome |
| `bun run format` | Format code with Biome |

---

## Project Structure

```
src/
├── app/
│   ├── [slug]/                 # Redirect engine
│   ├── admin/
│   │   ├── login/              # Admin login
│   │   └── (dashboard)/
│   │       ├── links/          # Link management
│   │       └── analytics/      # Analytics dashboard
│   └── api/
│       ├── auth/login          # Authentication
│       ├── links/              # Link CRUD
│       └── analytics/          # Analytics endpoints
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── links/                  # Link management UI
│   ├── analytics/              # Analytics UI components
│   └── charts/                 # Recharts chart components
└── lib/
    ├── db/                     # Database schema & queries
    ├── redis/                  # Redis cache & rate limiting
    ├── analytics/              # Click tracking
    ├── auth/                   # Authentication & session management
    ├── hooks/                  # React hooks
    └── validators/             # Zod validation schemas
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Authenticate with password |
| `GET` | `/api/links` | List links (cursor pagination) |
| `POST` | `/api/links` | Create a new link |
| `PATCH` | `/api/links/:id` | Update a link |
| `DELETE` | `/api/links/:id` | Delete a link |
| `GET` | `/api/analytics/summary` | Analytics summary |
| `GET` | `/api/analytics/clicks-over-time` | Clicks timeline |
| `GET` | `/api/analytics/top-links` | Most clicked links |
| `GET` | `/api/analytics/top-referrers` | Top referrer sources |
| `GET` | `/api/analytics/export` | Export clicks as CSV |

All API routes (except login) require authentication and are rate-limited.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌────────────┐
│  Visitor     │────▶│  Next.js     │────▶│  Redis     │
│  /:slug      │     │  [slug]/page │     │  (cache)   │
└─────────────┘     └──────┬───────┘     └────────────┘
                           │
                           │ miss
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL   │
                    │  (Drizzle)    │
                    └──────────────┘
```

Click tracking is fire-and-forget — the redirect is never blocked by analytics.

---

## License

This project is licensed under a custom license — see [LICENSE.md](LICENSE.md) for details.

Personal and educational use is permitted. Production use requires explicit written permission.
