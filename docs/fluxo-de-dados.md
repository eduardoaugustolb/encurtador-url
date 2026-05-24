# Fluxo de Dados

## 1. Redirect (o caminho crítico)

```mermaid
sequenceDiagram
    actor V as Visitante
    participant N as Next.js
    participant RL as Rate Limiter
    participant C as Redis Cache
    participant DB as PostgreSQL

    V->>N: GET /meu-slug
    N->>RL: rateLimit(100/min)
    RL->>RL: script Lua atômico
    alt Rate limited
        RL-->>V: 429 Too Many Requests
    else OK
        RL-->>N: allowed
        N->>C: resolveSlug("meu-slug")
        alt Cache Hit
            C-->>N: { id, destinationUrl, isActive }
        else Cache Miss
            C-x--N: null
            N->>DB: SELECT FROM links WHERE slug = ?
            DB-->>N: link data
            N->>C: SET slug:meu-slug (TTL 24h)
        end
        alt Slug inválido ou inativo
            N-->>V: 404
        else Slug válido
            N->>N: after() → trackClick()
            N-->>V: 307 Redirect → destinationUrl
        end
    end
```

### Pontos-chave:
- **Rate limit** vem primeiro — evita trabalho desnecessário
- **Cache-aside**: Redis primeiro, PG depois
- **trackClick()** roda dentro de `after()` — nunca bloqueia o redirect
- **307 redirect**: método HTTP preservado (GET permanece GET)

---

## 2. Admin — Login

```mermaid
sequenceDiagram
    actor A as Admin
    participant P as Login Page
    participant API as /api/auth/login
    participant RL as Rate Limiter
    participant J as JWT

    A->>P: GET /admin/login
    P-->>A: Página com formulário

    A->>API: POST { password }
    API->>RL: rateLimit(5/min por IP)
    alt Rate limited
        API-->>A: 429
    else OK
        API->>API: timingSafeEqual(password, ADMIN_PASSWORD)
        alt Senha errada
            API-->>A: 401
        else Senha correta
            API->>J: signSession() → HS256 JWT (7d)
            J-->>API: token
            API->>API: Set-Cookie: admin_session (HttpOnly, Secure, SameSite=Strict)
            API-->>A: { ok: true }
            A->>P: Redirect /admin/links
        end
    end
```

### Pontos-chave:
- **timingSafeEqual** — comparação em tempo constante contra timing attack
- **5 req/min** — proteção contra brute force
- **Cookie HttpOnly** — não acessível via JS

---

## 3. Admin — CRUD de Links

```mermaid
sequenceDiagram
    actor A as Admin
    participant MW as Middleware
    participant API as /api/links
    participant CSRF as validateOrigin
    participant V as Zod Validator
    participant SSRF as validateDestination
    participant DB as PostgreSQL
    participant C as Redis Cache
    participant AUD as Audit Log

    Note over A,AUD: Criar Link
    A->>API: POST { destinationUrl, title? }
    API->>MW: requireAdminWithRateLimit
    API->>CSRF: check Origin/Referer
    API->>V: createLinkSchema.parse()
    API->>SSRF: validateDestinationUrl()
    alt URL inválida ou IP privado
        API-->>A: 400/422
    else Válido
        API->>API: nanoid(7) p/ slug (ou slug custom)
        API->>DB: INSERT INTO links
        API->>AUD: INSERT INTO audit_log
        API-->>A: 201 { link }
    end

    Note over A,AUD: Editar Link
    A->>API: PATCH /api/links/:id
    API->>MW: Auth + Rate Limit
    API->>CSRF: Origin check
    API->>V: updateLinkSchema.parse()
    API->>SSRF: validateDestinationUrl() (se mudou)
    API->>DB: UPDATE links SET ...
    API->>C: invalidateSlug(slug) ← deleta cache
    API->>AUD: INSERT audit_log (before/after)
    API-->>A: 200 { link }
```

---

## 4. Analytics

```mermaid
sequenceDiagram
    actor A as Admin
    participant SC as Server Component
    participant F as flushClickBuffer
    participant Q as Query Functions
    participant R as Redis
    participant DB as PostgreSQL

    A->>SC: GET /admin/analytics
    SC->>F: flushClickBuffer() — sincroniza clicks pendentes
    F->>R: LRANGE clicks:buffer
    F->>DB: INSERT INTO clicks (batch)
    F->>R: DEL clicks:buffer

    SC->>Q: getAnalyticsSummary()
    Q->>DB: SELECT COUNT(*), modo, pico
    DB-->>Q: summary
    Q-->>SC: { totalClicks, peakDay, peakDayClicks }

    SC->>Q: getClicksOverTime(from, to)
    Q->>DB: SELECT DATE(clicked_at), COUNT(*) GROUP BY
    DB-->>Q: clicks por dia
    Q-->>SC: [{ date, clicks }]

    Note over SC: SSR com dados iniciais

    SC-->>A: Página renderizada com dados

    alt Mudou filtro de data
        A->>API: GET /api/analytics/clicks-over-time?from=X&to=Y
        API->>F: flushClickBuffer()
        API->>DB: query com filtro
        DB-->>API: filtered data
        API-->>A: JSON → recharts atualiza
    end
```

### Pontos-chave:
- **flushClickBuffer()** é chamado antes de toda query de analytics
- SSR envia dados iniciais; mudanças de filtro disparam fetch no client
- Validação de data: máximo 365 dias de janela

---

## 5. Tracking de Clique (detalhado)

```mermaid
flowchart LR
    A["/\[slug\]/page.tsx<br>307 Redirect"] --> B["after() callback"]
    B --> C["trackClick(linkId, req)"]
    C --> D{"slug resolvido<br>com sucesso?"}
    D -->|Sim| E[Extrair dados:<br>referrer, user-agent, ip]
    D -->|Não| F[Retorna<br>sem fazer nada]
    E --> G[Gerar<br>nanoid]
    E --> H[Gerar<br>uaHash: SHA-256]
    G --> I[Pipeline Redis:<br>LPUSH + LTRIM]
    H --> I
    I --> J[Redis list<br>clicks:buffer<br>max 5000]
```

O flush (escrita no PG) é explicado em [Processos em Background](processos-background.md).
