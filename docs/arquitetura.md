# Arquitetura

## Stack

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 80}}}%%
graph TB
    subgraph Client["🌐 Cliente"]
        Browser["Browser"]
    end

    subgraph NextJS["⚡ Next.js 16 (App Router)"]
        direction TB
        P["proxy.ts (Node.js)"]
        RH["Route Handlers<br/>[slug].ts + API"]
        SC["Server Components"]
        CC["Client Components"]
    end

    subgraph Services["☁️ Serviços"]
        PG[("PostgreSQL")]
        REDIS[("Redis")]
    end

    Browser -->|"/slug"| RH
    Browser -->|"/admin/**"| P
    P -->|auth ok| SC
    P -->|auth ok| RH

    RH -->|dados persistentes| PG
    RH -->|cache + rate limit| REDIS

    SC -->|dados persistentes| PG
    SC -->|analytics queries| REDIS

    CC -->|fetch| RH
```

## Estrutura de Pastas

```
src/
├── app/                    # App Router (páginas + API)
│   ├── [slug]/
│   │   └── route.ts        # Motor de redirect (Node.js)
│   ├── admin/
│   │   ├── layout.tsx      # QueryProvider
│   │   ├── login/          # Página de login (GSAP)
│   │   ├── (dashboard)/    # Layout protegido com nav
│   │   │   ├── links/      # Gerenciamento de links
│   │   │   └── analytics/  # Dashboard de analytics
│   │   └── page.tsx        # redirect → /admin/links
│   └── api/                # REST API
│       ├── auth/login
│       ├── links/
│       ├── analytics/
│       └── cache/wipe
├── components/             # UI components
│   ├── ui/                 # shadcn primitives
│   ├── links/              # Link list, card, forms
│   ├── analytics/
│   └── charts/             # Recharts wrappers
└── lib/                    # Core logic
    ├── db/                 # Drizzle schema + queries
    ├── redis/              # Cache client + rate limiter + buffer
    ├── analytics/          # Click tracking + flush
    ├── auth/               # JWT, session, guards, actions
    ├── validators/         # Zod schemas + SSRF filter
    └── hooks/              # React hooks
```

## Ciclo de Vida de uma Requisição

```mermaid
%%{init: {'sequence': {'actorMargin': 55, 'boxMargin': 22}}}%%
sequenceDiagram
    autonumber
    participant U as Usuário
    participant N as Next.js
    participant RH as Route Handler
    participant API as API Route
    participant R as Redis
    participant P as PostgreSQL

    Note over U,P: ─── Redirect Flow ───
    U->>N: GET /abc1234
    N->>RH: [slug]/route.ts

    RH->>R: checkRateLimit (100/min)
    RH->>R: resolveSlug("abc1234")
    alt Cache Hit
        R-->>RH: { destinationUrl }
    else Cache Miss
        RH->>P: SELECT links WHERE slug = ?
        P-->>RH: link data
        RH->>R: SET slug:… (TTL 24h)
    end

    RH-->>U: 307 Redirect
    Note over RH: after() → trackClick()<br/>(Redis pipeline LPUSH)

    Note over U,P: ─── Admin API Flow ───
    U->>N: GET /api/links
    N->>API: requireAdminWithRateLimit

    API->>R: rate limit (Lua script)
    API->>P: paginateLinks(cursor)
    P-->>API: { data, nextCursor }
    API-->>U: JSON response
```

## Componentes e suas Responsabilidades

### Server-Side

| Componente | Arquivo | Papel |
|---|---|---|
| Redirect Engine | `src/app/[slug]/route.ts` | Resolve slug, rate limit, redireciona |
| Auth Guard | `src/proxy.ts` | Protege rotas `/admin/*`, verifica JWT |
| Auth Guard (API) | `src/lib/auth/require-admin-with-rate-limit.ts` | Verifica cookie JWT + rate limit em APIs |
| Rate Limiter | `src/lib/redis/rate-limit.ts` | Lua script p/ sliding window |
| Slug Cache | `src/lib/redis/index.ts` | Cache-aside de slugs |
| Queries | `src/lib/db/queries/` | SQL tipado via Drizzle |

### Client-Side (Admin)

| Componente | Arquivo | Papel |
|---|---|---|
| QueryProvider | `src/components/query-provider.tsx` | React Query provider |
| LinkList | `src/components/links/link-list.tsx` | Infinite scroll list |
| Login | `src/app/admin/login/page.tsx` | Formulário de login com GSAP |
| DashboardLayout | `src/app/admin/(dashboard)/layout.tsx` | Nav + GSAP entrance animation |

---

[← Visão Geral](visao-geral.md) · [Fluxo de Dados →](fluxo-de-dados.md)
