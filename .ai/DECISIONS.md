# Architecture Decisions

## ADR-001 — Edge vs Node.js for slug redirect

**Decision:** Use `middleware.ts` (Edge) for slug resolution and redirect.

**Context:** Next.js 16 has two interceptors: `middleware.ts` (Edge) and `proxy.ts` (Node.js). The redirect path is the most latency-sensitive operation in the app.

**Consequence:** `ioredis` does not work on the Edge Runtime. If Redis at Square Cloud is not accessible via a TCP-compatible Edge client, the fallback is to move slug resolution into `proxy.ts` and accept ~1–2ms additional latency. Document the final choice here after testing connectivity.

**Status:** Pending validation against Square Cloud Redis connectivity from Vercel Edge.

---

## ADR-002 — No BullMQ / no queue

**Decision:** Use `waitUntil` for fire-and-forget analytics tracking instead of a job queue.

**Context:** BullMQ adds a separate worker process, more infra surface, and complexity. A single `INSERT` into Postgres is not a workload that needs a queue — it takes <5ms and needs no retry semantics beyond what Postgres already provides.

**Consequence:** If the Vercel function is killed before `waitUntil` completes, that click is lost. This is acceptable for a personal analytics tool.

---

## ADR-003 — Hard delete for links

**Decision:** Deleting a link does a hard delete with CASCADE on clicks.

**Context:** Soft delete adds `deletedAt` columns and complicates every query. For a single-admin tool, data recovery is not a priority.

**Consequence:** Deleted links and all their analytics are permanently gone. Export before deleting if retention matters.

---

## ADR-004 — `use cache` on aggregate queries only

**Decision:** Only analytics aggregate queries and individual link lookups use `"use cache"`. The redirect path uses Redis directly.

**Context:** The `use cache` directive is for RSC and Server Action results. The redirect in `middleware.ts` runs before React — it cannot use Next.js cache. Redis is the correct cache layer for the hot path.

---

## ADR-005 — Single admin, no RBAC

**Decision:** One hardcoded admin user via env var, no database user table.

**Context:** This is a personal tool. Adding a users table, password hashing at registration, and RBAC would consume a significant portion of the 4-hour build budget with zero benefit for a single user.

**Consequence:** Changing the admin password requires a redeployment.
