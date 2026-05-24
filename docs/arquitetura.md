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
        MW["Middleware proxy.ts"]
        SC["Server Components"]
        CC["Client Components"]
        API["API Routes"]
    end

    subgraph Services["☁️ Serviços"]
        PG[("PostgreSQL (Neon)")]
        REDIS[("Redis")]
    end

    Browser --> MW

    MW -->|rota pública| SC
    MW -->|rota /api/*| API

    SC -->|dados persistentes| PG
    SC -->|cache + rate limit| REDIS

    API -->|CRUD + queries| PG
    API -->|cache + rate limit| REDIS

    CC -->|fetch| API
```

## Estrutura de Pastas

```
src/
├── app/                    # App Router (páginas + API)
│   ├── [slug]/
│   │   └── route.ts        # Motor de redirect
│   ├── admin/
│   │   ├── login/          # Página de login
│   │   └── (dashboard)/    # Layout protegido
│   │       ├── links/      # Gerenciamento de links
│   │       └── analytics/  # Dashboard de analytics
│   └── api/                # REST API
│       ├── auth/login
│       ├── links/
│       ├── analytics/
│       └── ...
├── components/             # UI components
│   ├── ui/                 # shadcn/base-ui primitives
│   ├── links/              # Link list, card, forms
│   ├── analytics/
│   └── charts/             # Recharts wrappers
└── lib/                    # Core logic
    ├── db/                 # Drizzle schema + queries
    ├── redis/              # Cache client + rate limiter
    ├── analytics/          # Click tracking + flush
    ├── auth/               # JWT, session, middleware
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
    participant MW as Middleware
    participant SC as Server Component
    participant API as API Route
    participant R as Redis
    participant P as PostgreSQL

    Note over U,P: ─── Redirect Flow ───
    U->>N: GET /abc1234
    N->>MW: middleware
    MW-->>N: next() (admin only)
    N->>API: [slug]/route (GET)

    API->>R: resolveSlug("abc1234")
    alt Cache Hit
        R-->>API: { destinationUrl }
    else Cache Miss
        API->>P: SELECT links WHERE slug = ?
        P-->>API: link data
        API->>R: SET slug:… (TTL 24h)
    end

    API-->>U: 307 Redirect

    Note over U,P: ─── Admin API Flow ───
    U->>N: GET /api/links
    N->>MW: middleware (auth JWT)
    MW->>API: requireAdminWithRateLimit

    API->>R: rate limit (Lua script)
    API->>P: paginateLinks(cursor)
    P-->>API: { data, nextCursor }
    API-->>U: JSON response
```

## Componentes e suas Responsabilidades

### Server-Side

| Componente | Arquivo | Papel |
|---|---|---|
| Redirect Engine | `src/app/[slug]/route.ts` | Resolve slug, aplica rate limit, redireciona |
| Middleware | `src/proxy.ts` | Protege rotas `/admin/*`, verifica JWT |
| Auth Guard | `src/lib/auth/require-admin.ts` | Verifica cookie JWT em APIs |
| Rate Limiter | `src/lib/redis/rate-limit.ts` | Lua script p/ sliding window |
| Cache | `src/lib/redis/index.ts` | Cache-aside de slugs |
| Queries | `src/lib/db/queries/` | SQL tipado via Drizzle |

### Client-Side (Admin)

| Componente | Arquivo | Papel |
|---|---|---|
| QueryProvider | `src/components/query-provider.tsx` | React Query provider |
| LinkList | `src/components/links/link-list.tsx` | Infinite scroll list |
| AnalyticsDashboard | `src/components/analytics/` | Gráficos + filtros |
| Login | `src/app/admin/login/page.tsx` | Formulário de login |

---

[← Visão Geral](visao-geral.md) · [Fluxo de Dados →](fluxo-de-dados.md)
