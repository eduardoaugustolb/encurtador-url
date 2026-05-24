# Visão Geral

## Propósito

Bit Link permite criar URLs curtas (ex: `encurta.dev/abc1234`) que redirecionam para URLs longas, com coleta de analytics (cliques, referrer, país).

## Conceitos Aplicados

### 1. App Router com Server Components

Next.js 16 com App Router. A página de redirect (`/[slug]`) é um **Server Component** (`force-dynamic`) que executa lógica no servidor e nunca envia JS ao cliente. O painel admin mescla Server Components (dados iniciais SSR) e Client Components (interatividade).

### 2. Cache-Aside com Redis

O padrão **cache-aside** é usado para resolver slugs:

```
1. Busca slug no Redis
2. Se existir (cache hit) → usa os dados cacheados (24h TTL)
3. Se não existir (cache miss) → busca no PostgreSQL → popula cache
```

Isso evita que todo redirect bata no banco PostgreSQL, reduzindo latência e custo (Neon cobra por uso).

### 3. Sliding Window Rate Limiting via Lua

Dois rate limiters implementados com **Redis + script Lua**:

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /api/auth/login` | 5 req | 1 min |
| Demais APIs admin | 60 req | 1 min |
| `GET /[slug]` (redirect) | 100 req | 1 min |

O script Lua é **atômico**: remove entradas expiradas, conta as restantes, adiciona a atual, tudo numa operação só. Isso evita race conditions.

### 4. Stateless Auth com JWT

A sessão admin usa **JWT (HS256)** armazenado em cookie HttpOnly/Secure/SameSite=Strict. Não há banco de sessão — o token é auto-contido e verificado com `jose`. Expira em 7 dias.

### 5. Validação com Zod + t3-env

- **t3-env**: Valida variáveis de ambiente no startup. Se `DATABASE_URL` estiver faltando, o app nem sobe.
- **Zod schemas**: Toda input de API é validada contra schemas tipados, com mensagens de erro descritivas.

### 6. Wipe Cache no Dashboard

O dashboard de analytics tem um botão **"Limpar Cache"** que invalida todos os slugs cacheados no Redis. Como o cache depende do PostgreSQL (e não o contrário), limpar o cache nunca afeta os dados — o Redis é repopulado na próxima requisição via cache-aside.

### 7. SSRF Protection

URLs de destino passam por `validateDestinationUrl()`, que faz parse do hostname e verifica se o IP resolve para range privado (10.x, 172.16-31.x, 192.168.x, 127.x, etc.). Bloqueia tentativas de usar o encurtador para atingir serviços internos.

### 7. Buffer de Cliques com Flush Confiável

Clicks de redirect são inseridos primeiro no Redis (`LPUSH` + `LTRIM`, O(1)) para não bloquear o redirect. Um flush confiável persiste os dados no PostgreSQL:

```
Redirect → after() → LPUSH Redis → LTRIM (cap 5000)
                                         ↓
Analytics consultado → flushClickBuffer() → LRANGE → INSERT batch → LTRIM start=N
```

O uso de `LTRIM` em vez de `DEL` garante que dados já persistidos não sejam re-inseridos mesmo em caso de falha parcial.

### 8. Cache de Slugs (Cache-Aside com Redis)

O cache de slugs segue o padrão **cache-aside**: o Redis é populado a partir do PostgreSQL e pode ser limpo sem perda de dados:

```
1. Busca slug no Redis
2. Se existir (cache hit) → usa (24h TTL)
3. Se não existir (cache miss) → busca no PG → popula cache
```

O cache é invalidado automaticamente ao criar, atualizar ou deletar links (`invalidateSlug()`). O botão "Limpar Cache" no dashboard permite limpeza manual.

### 8. Cursor-Based Pagination

A listagem de links usa **cursor pagination** em vez de `OFFSET`:

- O cursor codifica `createdAt + id` em base64
- Usa `WHERE (createdAt < cursor.createdAt OR (createdAt = cursor.createdAt AND id < cursor.id))`
- Mais performático que `OFFSET` para tabelas grandes, consistente mesmo com inserts

### 9. Infinite Scroll no Frontend

A página de links admin usa **React Query** (`useInfiniteLinks`) com `IntersectionObserver` para carregar mais dados conforme o usuário rola a página — sem botão "carregar mais".

### 10. OpenTelemetry Tracing

Cada operação crítica (resolve slug, rate limit, DB query) é instrumentada com spans OTel via `traceStep()`. Em produção (Vercel), os traces são exportados automaticamente.

---

[← README](README.md) · [Arquitetura →](arquitetura.md)
