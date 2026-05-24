# Arquitetura

## Stack

```mermaid
graph TB
    subgraph Client
        Browser
    end

    subgraph "Next.js 16 (App Router)"
        MW[Middleware proxy.ts]
        SC[Server Components]
        CC[Client Components]
        API[API Routes]
    end

    subgraph "Services"
        PG[(PostgreSQL - Neon)]
        REDIS[(Redis)]
    end

    Browser --> MW
    MW --> SC
    MW --> API
    SC --> PG
    SC --> REDIS
    API --> PG
    API --> REDIS
    CC --> API
```

## Estrutura de Pastas

```
src/
├── app/                    # App Router (páginas + API)
│   ├── [slug]/
│   │   └── page.tsx        # Motor de redirect
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
sequenceDiagram
    participant U as Usuário
    participant N as Next.js
    participant MW as Middleware
    participant SC as Server Component
    participant API as API Route
    participant R as Redis
    participant P as PostgreSQL

    Note over U,P: Redirect Flow
    U->>N: GET /abc1234
    N->>MW: Next.js middleware
    MW->>SC: Encaminha para [slug]/page
    SC->>R: resolveSlug("abc1234")
    alt Cache hit
        R-->>SC: { destinationUrl }
    else Cache miss
        SC->>P: SELECT * FROM links WHERE slug = ?
        P-->>SC: result
        SC->>R: SET slug:abc1234 (TTL 24h)
    end
    SC-->>U: 307 Redirect

    Note over U,P: Admin API Flow
    U->>N: GET /api/links
    N->>MW: middleware (auth check)
    MW->>API: requireAdminWithRateLimit
    API->>R: rate limit check (Lua)
    API->>P: paginateLinks()
    P-->>API: data
    API-->>U: JSON response
```

## Componentes e suas Responsabilidades

### Server-Side

| Componente | Arquivo | Papel |
|---|---|---|
| Redirect Engine | `src/app/[slug]/page.tsx` | Resolve slug, aplica rate limit, redireciona |
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
