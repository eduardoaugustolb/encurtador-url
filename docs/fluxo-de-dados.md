# Fluxo de Dados

## 1. Redirect (o caminho crítico)

```mermaid
%%{init: {'sequence': {'actorMargin': 60, 'boxMargin': 25}}}%%
sequenceDiagram
    autonumber
    actor V as Visitante
    participant N as Next.js
    participant RL as Rate Limiter
    participant C as Redis Cache
    participant DB as PostgreSQL

    Note over V,DB: ─── 1/3 — Rate Limit (100 req/min) ───
    V->>N: GET /meu-slug
    N->>RL: checkRateLimit("slug-resolve", ip)
    RL->>RL: script Lua atômico (sorted set)
    alt Excedeu limite
        RL-->>V: 404 (sem indicar motivo)
        Note over V: Fim — não prossegue
    end

    Note over V,DB: ─── 2/3 — Cache-aside (Redis → PostgreSQL) ───
    N->>C: resolveSlug("meu-slug")
    alt Cache Hit
        C-->>N: { destinationUrl, isActive }
    else Cache Miss
        C--xN: null
        N->>DB: SELECT links WHERE slug = ?
        DB-->>N: link data
        N->>C: SET slug:… (TTL 24h)
    end

    Note over V,DB: ─── 3/3 — Decisão de Redirect ───
    alt Slug inválido ou inativo
        N-->>V: 404
    else Slug válido
        N->>N: after() → trackClick()
        Note over N: trackClick usa pipeline Redis<br/>(LPUSH + LTRIM, não insere direto no PG)
        N-->>V: 307 Redirect → destinationUrl
    end
```

### Pontos-chave:
- **Rate limit** roda em paralelo com slug resolution (`Promise.all`)
- **Cache-aside**: Redis primeiro, PG depois
- **trackClick()** escreve em pipeline Redis, não direto no PostgreSQL
- **after()** substitui o padrão waitUntil anterior
- **307 redirect**: método HTTP preservado (GET permanece GET)

---

## 2. Admin — Login

```mermaid
%%{init: {'sequence': {'actorMargin': 60, 'boxMargin': 20}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant P as Login Page
    participant t as tRPC: auth.login
    participant RL as Rate Limiter
    participant J as JWT

    Note over A,J: ─── 1/3 — Exibição do formulário ───
    A->>P: GET /admin/login
    P-->>A: Página com formulário (GSAP animation)

    Note over A,J: ─── 2/3 — Rate Limit + Senha (tRPC mutation) ───
    A->>P: Submit password
    P->>t: api.auth.login.useMutation({ password })
    t->>RL: rateLimit(5/min por IP)
    alt Rate limit excedido
        t-->>A: TRPCError TOO_MANY_REQUESTS
        Note over A: Fim
    else OK
        t->>t: timingSafeEqual(password)
        alt Senha inválida
            t-->>A: TRPCError UNAUTHORIZED
            Note over A: Fim
        end
    end

    Note over A,J: ─── 3/3 — Geração do token ───
    t->>J: signSession() → HS256 (7d)
    J-->>t: token
    t->>t: Set-Cookie via cookies() from next/headers
    t-->>A: { ok: true }
    A->>P: router.push("/admin/links")
```

### Pontos-chave:
- **timingSafeEqual** — comparação em tempo constante contra timing attack
- **5 req/min** — proteção contra brute force
- **Cookie HttpOnly + SameSite=Strict** — não acessível via JS
- Login usa `publicProcedure` com rate limit manual (diferente do middleware global)

---

## 3. Admin — CRUD de Links (via tRPC)

```mermaid
%%{init: {'sequence': {'actorMargin': 50, 'boxMargin': 18}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant t as tRPC: links.*
    participant M as Middleware Chain
    participant DB as PostgreSQL
    participant AUD as Audit Log
    participant C as Redis Cache

    Note over A,C: ─── CREATE — links.create ───
    A->>t: api.links.create.useMutation({ destinationUrl, title? })
    t->>M: adminMutationProcedure<br/>(auth + rate limit + CSRF)
    alt Validação falhou
        M-->>A: TRPCError
        Note over A: Fim
    else Tudo OK
        t->>t: nanoid(7) como slug
        t->>DB: INSERT INTO links
        t->>C: invalidateSlug() (limpa cache)
        t->>AUD: INSERT audit_log
        t-->>A: { link }
    end

    Note over A,C: ─── UPDATE — links.update ───
    A->>t: api.links.update.useMutation({ id, ... })
    t->>M: adminMutationProcedure
    alt Autorizado
        t->>DB: UPDATE links SET … WHERE id = ?
        t->>C: invalidateSlug()
        t->>AUD: INSERT audit_log (before/after)
        t-->>A: { link }
    end

    Note over A,C: ─── DELETE — links.delete ───
    A->>t: api.links.delete.useMutation({ id })
    t->>M: adminMutationProcedure
    alt Autorizado
        t->>DB: DELETE links WHERE id = ?
        Note over DB: ON DELETE CASCADE<br/>remove clicks também
        t->>C: invalidateSlug()
        t->>AUD: INSERT audit_log
        t-->>A: { ok: true }
    end
```

---

## 4. Analytics (via tRPC)

```mermaid
%%{init: {'sequence': {'actorMargin': 55, 'boxMargin': 20}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant SC as Server Component
    participant F as flushClickBuffer
    participant R as Redis
    participant DB as PostgreSQL

    Note over A,DB: ─── 1/3 — Flush: Redis → PostgreSQL ───
    A->>SC: GET /admin/analytics
    SC->>SC: createSSRCaller()
    SC->>F: caller.analytics.summary() → flushClickBuffer() (com lock distribuído)
    F->>R: LRANGE clicks:buffer
    R-->>F: [click, click, …]
    F->>DB: INSERT batch
    F->>R: LTRIM clicks:buffer N -1
    Note over F: LTRIM remove só os N<br/>processados, não o buffer todo

    Note over A,DB: ─── 2/3 — Queries de Analytics via tRPC (SSR) ───
    SC->>SC: 4 chamadas paralelas ao server caller
    SC->>DB: getAnalyticsSummary, getClicksOverTime, getTopLinks, getTopReferrers
    DB-->>SC: dados
    SC-->>A: Página renderizada com gráficos

    Note over A,DB: ─── 3/3 — Mudança de filtro (client-side via tRPC) ───
    A->>A: Seleciona nova data
    A->>A: api.analytics.summary.useQuery()
    A->>A: api.analytics.clicksOverTime.useQuery()
    A->>A: api.analytics.topLinks.useQuery()
    A->>A: api.analytics.topReferrers.useQuery()
    Note over A: TanStack Query refetch com novo filtro
    A->>DB: 4 queries com filtro
    DB-->>A: dados filtrados → recharts atualiza
```

### Pontos-chave:
- **flushClickBuffer()** é chamado antes de toda query de analytics (dentro das funções Drizzle)
- **Lock distribuído** (SET NX PX 30000) previne duplicação entre 4 chamadas paralelas
- **LTRIM** remove só os registros processados, nunca dados concorrentes
- SSR usa `createSSRCaller()` para dados iniciais (passados como props fallback); mudanças de filtro usam `useQuery` via tRPC (refetch automático)
- Validação de data: máximo 365 dias de janela

---

## 5. Tracking de Clique (detalhado)

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 90}}}%%
flowchart TB
    A["/\\[slug\\]/route.ts<br/>307 Redirect"] --> B["after() callback"]
    B --> C["trackClick(linkId, req)"]

    C --> D{"slug resolvido<br/>com sucesso?"}

    D -->|Não| F["Retorna<br/>sem fazer nada"]
    D -->|Sim| E["Extrair dados:<br/>referrer · user-agent · country"]

    E --> G["Calcular uaHash<br/>(SHA-256 via crypto)"]

    G --> I["Pipeline Redis<br/>LPUSH + LTRIM"]
    I --> J["Redis clicks:buffer<br/>(máx 5.000)"]

    K["flushClickBuffer()<br/>(chamado antes de analytics)"] --> L["acquireLock()"]
    L --> M["LRANGE → INSERT batch → LTRIM N -1"]
    M --> N[("PostgreSQL<br/>tabela clicks")]
```

---

[← Arquitetura](arquitetura.md) · [Banco de Dados →](banco-de-dados.md)
