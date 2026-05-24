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

    rect rgb(245, 245, 250)
        Note over V,DB: 1/3 — Rate Limit (100 req/min)
        V->>N: GET /meu-slug
        N->>RL: rateLimit("meu-slug")
        RL->>RL: script Lua atômico
        alt Excedeu limite
            RL-->>V: 429 Too Many Requests
            Note over V: Fim — não prossegue
        end
    end

    rect rgb(255, 252, 235)
        Note over V,DB: 2/3 — Cache-aside (Redis → PostgreSQL)
        N->>C: resolveSlug("meu-slug")
        alt Cache Hit
            C-->>N: { destinationUrl, isActive }
        else Cache Miss
            C--xN: null
            N->>DB: SELECT links WHERE slug = ?
            DB-->>N: link data
            N->>C: SET slug:… (TTL 24h)
        end
    end

    rect rgb(235, 250, 235)
        Note over V,DB: 3/3 — Decisão de Redirect
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
%%{init: {'sequence': {'actorMargin': 60, 'boxMargin': 20}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant P as Login Page
    participant API as /api/auth/login
    participant RL as Rate Limiter
    participant J as JWT

    rect rgb(240, 245, 255)
        Note over A,J: 1/3 — Exibição do formulário
        A->>P: GET /admin/login
        P-->>A: Página com formulário
    end

    rect rgb(255, 252, 235)
        Note over A,J: 2/3 — Rate Limit + Senha
        A->>API: POST { password }
        API->>RL: rateLimit(5/min por IP)
        alt Rate limit excedido
            API-->>A: 429 Too Many Requests
            Note over A: Fim
        else OK
            API->>API: timingSafeEqual(password)
            alt Senha inválida
                API-->>A: 401 Unauthorized
                Note over A: Fim
            end
        end
    end

    rect rgb(235, 250, 235)
        Note over A,J: 3/3 — Geração do token
        API->>J: signSession() → HS256 (7d)
        J-->>API: token
        API->>API: Set-Cookie<br/>HttpOnly · Secure · SameSite=Strict
        API-->>A: { ok: true }
        A->>P: Redirect → /admin/links
    end
```

### Pontos-chave:
- **timingSafeEqual** — comparação em tempo constante contra timing attack
- **5 req/min** — proteção contra brute force
- **Cookie HttpOnly** — não acessível via JS

---

## 3. Admin — CRUD de Links

```mermaid
%%{init: {'sequence': {'actorMargin': 50, 'boxMargin': 18}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant API as /api/links
    participant G as Guards
    participant DB as PostgreSQL
    participant AUD as Audit Log

    rect rgb(255, 252, 235)
        Note over A,AUD: CREATE — POST /api/links
        A->>API: POST { destinationUrl, title? }
        API->>G: Auth + Rate Limit + CSRF + Zod + SSRF
        alt Validação falhou
            G-->>A: 400 / 422
            Note over A: Fim
        else Tudo OK
            API->>API: nanoid(7) como slug
            API->>DB: INSERT INTO links
            API->>AUD: INSERT link.create
            API-->>A: 201 { link }
        end
    end

    rect rgb(235, 245, 255)
        Note over A,AUD: UPDATE — PATCH /api/links/:id
        A->>API: PATCH /api/links/:id
        API->>G: Auth + Rate Limit + CSRF + Zod + SSRF
        alt Validação falhou
            G-->>A: 400 / 422
            Note over A: Fim
        else Tudo OK
            API->>DB: UPDATE links SET … WHERE id = ?
            API->>AUD: INSERT link.update (before/after)
            API-->>A: 200 { link }
        end
    end

    rect rgb(255, 240, 240)
        Note over A,AUD: DELETE — DELETE /api/links/:id
        A->>API: DELETE /api/links/:id
        API->>G: Auth + Rate Limit + CSRF
        alt Autorizado
            API->>DB: DELETE links WHERE id = ?
            Note over DB: ON DELETE CASCADE<br/>remove clicks também
            API->>AUD: INSERT link.delete
            API-->>A: 204 No Content
        end
    end
```

---

## 4. Analytics

```mermaid
%%{init: {'sequence': {'actorMargin': 55, 'boxMargin': 20}}}%%
sequenceDiagram
    autonumber
    actor A as Admin
    participant SC as Server Component
    participant F as flushClickBuffer
    participant R as Redis
    participant DB as PostgreSQL

    rect rgb(255, 252, 235)
        Note over A,DB: 1/3 — Flush: Redis → PostgreSQL
        A->>SC: GET /admin/analytics
        SC->>F: flushClickBuffer()
        F->>R: LRANGE clicks:buffer
        R-->>F: [click, click, …]
        F->>DB: INSERT batch
        F->>R: DEL clicks:buffer
        Note over F: Erro é silencioso<br/>não bloqueia o resto
    end

    rect rgb(235, 250, 235)
        Note over A,DB: 2/3 — Queries de Analytics (SSR)
        SC->>SC: getAnalyticsSummary()
        SC->>SC: getClicksOverTime(from, to)
        SC->>SC: getTopLinks()
        SC->>SC: getTopReferrers()
        SC->>DB: 4 queries paralelas
        DB-->>SC: summary, clicks, top, referrers
        Note over SC: SSR com dados iniciais
        SC-->>A: Página renderizada com gráficos
    end

    rect rgb(235, 245, 255)
        Note over A,DB: 3/3 — Mudança de filtro (client-side)
        A->>A: Seleciona nova data
        A->>API: GET /api/analytics/…?from=X&to=Y
        API->>F: flushClickBuffer()
        API->>DB: query com filtro
        DB-->>API: dados filtrados
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
%%{init: {'flowchart': {'nodeSpacing': 60, 'rankSpacing': 90}}}%%
flowchart TB
    A["/\\[slug\\]/page.tsx<br/>307 Redirect"] --> B["after() callback"]
    B --> C["trackClick(linkId, req)"]

    C --> D{"slug resolvido<br/>com sucesso?"}

    D -->|Não| F["Retorna<br/>sem fazer nada"]
    D -->|Sim| E["Extrair dados:<br/>referrer · user-agent · IP"]

    E --> G["Gerar nanoid"]
    E --> H["Gerar uaHash<br/>(SHA-256 do UA)"]

    G --> I["Pipeline Redis<br/>LPUSH + LTRIM"]
    H --> I

    I --> J["Redis clicks:buffer<br/>(máx 5.000)"]
```

O flush (escrita no PG) é explicado em [Processos em Background](processos-background.md).

---

[← Arquitetura](arquitetura.md) · [Banco de Dados →](banco-de-dados.md)
