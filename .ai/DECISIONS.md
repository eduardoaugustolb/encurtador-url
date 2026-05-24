# Architecture Decisions

## ADR-001 — Edge vs Node.js for slug redirect

**Decision:** Use `src/app/[slug]/route.ts` (Node.js Route Handler) for slug resolution and redirect.

**Context:** Next.js 16 has two interceptors: `middleware.ts` (Edge) and `proxy.ts` (Node.js). The redirect path is the most latency-sensitive operation. After evaluation, the Node.js route handler was chosen because it has direct access to `ioredis` (Redis) and the full Node.js API without edge compatibility constraints. The added latency (~1-2ms vs Edge) is negligible.

**Status:** Implemented. No middleware.ts exists in this project.

---

## ADR-002 — No BullMQ / no queue

**Decision:** Use `after()` for fire-and-forget analytics tracking instead of a job queue. Clicks are buffered in Redis (LPUSH + LTRIM) and batch-flushed to Postgres on analytics queries.

**Context:** BullMQ adds a separate worker process, more infra surface, and complexity. A single pipeline write to Redis takes <1ms.

**Consequence:** If the Vercel function is killed before `after()` completes, that click is lost. This is acceptable for a personal analytics tool. For durability, the Redis buffer survives crashes until the next flush.

---

## ADR-003 — Hard delete for links

**Decision:** Deleting a link does a hard delete with CASCADE on clicks.

**Context:** Soft delete adds `deletedAt` columns and complicates every query. For a single-admin tool, data recovery is not a priority.

**Consequence:** Deleted links and all their analytics are permanently gone. Export before deleting if retention matters.

---

## ADR-004 — No `use cache` on analytics queries

**Decision:** Analytics queries do **not** use the `"use cache"` directive. Instead, each query calls `flushClickBuffer()` to persist buffered clicks, then queries Postgres directly.

**Context:** The `use cache` directive introduces staleness that conflicts with the read-your-writes requirement — the admin expects recent clicks to appear immediately. Direct Postgres queries after flushing the Redis buffer provide consistency without cache invalidation complexity.

**Redis handles two cache concerns:**
- Slug cache (`slug:*`) — cache-aside, 24h TTL
- Rate limiting — sorted sets with Lua
- Click buffer — `clicks:buffer` (not a cache, a buffer)

---

## ADR-005 — Single admin, no RBAC

**Decision:** One hardcoded admin user via env var, no database user table.

**Context:** This is a personal tool. Adding a users table, password hashing at registration, and RBAC would not benefit a single user.

**Consequence:** Changing the admin password requires a redeployment.

---

## ADR-006 — Rate limiting on redirect path

**Decision:** Rate limiting is applied to the slug redirect (100 req/min per IP), not just admin routes.

**Context:** Protects against abuse of the redirect as a URL-based reflector. Rate limiting uses Redis sorted sets with an atomic Lua script.

**Consequence:** Rate-limited requests receive a 404 (no indication of the reason).
