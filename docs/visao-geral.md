# Visão Geral

## Propósito

Bit Link permite criar URLs curtas (ex: `encurta.dev/abc1234`) que redirecionam para URLs longas, com coleta de analytics (cliques, referrer, país).

## Conceitos Aplicados

### 1. tRPC — Type Safety Full-Stack

Todas as APIs admin são expostas via **tRPC v11** com transformer superjson, substituindo os 9 route handlers REST anteriores. Um único HTTP handler em `api/trpc/[trpc]/route.ts` serve todos os procedimentos.

**Benefícios:**
- Tipos gerados automaticamente das definições de procedimento — zero `fetch()` manual
- Zod schemas reutilizados como input das procedures
- Middleware chain substitui `requireAdminWithRateLimit` repetido
- CSRF automático em mutations via middleware
- Server Components usam `createSSRCaller()` para SSR type-safe
- Cliente usa hooks tipados: `api.links.list.useQuery()`, `api.auth.login.useMutation()`

**O que não migrou:**
- `[slug]/route.ts` (redirect HTTP 307) — não é uma API
- `proxy.ts` (auth guard) — interceptor Node.js, não tRPC
- `logoutAction` (Server Action) — não precisa de API

### 2. App Router com Server Components

Next.js 16 com App Router. A página de redirect (`/[slug]`) é um **Route Handler** (`force-dynamic`) que executa lógica no servidor e nunca envia JS ao cliente. O painel admin mescla Server Components (dados iniciais SSR) e Client Components (interatividade).

### 2. Cache-Aside com Redis

O padrão **cache-aside** é usado para resolver slugs:

```
1. Busca slug no Redis
2. Se existir (cache hit) → usa os dados cacheados (24h TTL)
3. Se não existir (cache miss) → busca no PostgreSQL → popula cache
```

Isso evita que todo redirect bata no banco PostgreSQL, reduzindo latência e custo.

### 3. Sliding Window Rate Limiting via Lua

Três rate limiters implementados com **Redis + script Lua**:

| Endpoint | Limite | Janela |
|---|---|---|
| `POST /api/auth/login` | 5 req | 1 min |
| Demais APIs admin | 60 req | 1 min |
| `GET /[slug]` (redirect) | 100 req | 1 min |

O script Lua é **atômico**: usa sorted sets (ZREMRANGEBYSCORE, ZADD) para sliding window precisa.

### 4. Stateless Auth com JWT

A sessão admin usa **JWT (HS256)** armazenado em cookie HttpOnly/Secure/SameSite=Strict. Não há banco de sessão — o token é auto-contido e verificado com `jose`. Expira em 7 dias.

### 5. Validação com Zod + t3-env

- **t3-env**: Valida variáveis de ambiente no startup. Se `DATABASE_URL` estiver faltando, o app nem sobe.
- **Zod schemas**: Toda input de API é validada contra schemas tipados, com mensagens de erro descritivas.

### 6. Wipe Cache no Dashboard

O dashboard de analytics tem um botão **"Limpar Cache"** que invalida todos os slugs cacheados no Redis. Como o cache depende do PostgreSQL (e não o contrário), limpar o cache nunca afeta os dados — o Redis é repopulado na próxima requisição via cache-aside.

### 7. SSRF Protection

URLs de destino passam por `validateDestinationUrl()`, que faz parse do hostname e verifica se o IP resolve para range privado (10.x, 172.16-31.x, 192.168.x, 127.x, etc.). Bloqueia tentativas de usar o encurtador para atingir serviços internos.

### 8. Buffer de Cliques com Flush Confiável

Clicks de redirect são inseridos primeiro no Redis (`LPUSH` + `LTRIM`, O(1)) para não bloquear o redirect. Um flush confiável persiste os dados no PostgreSQL:

```
Redirect → after() → LPUSH Redis → LTRIM (cap 5000)
                                          ↓
Analytics consultado → flushClickBuffer() → LRANGE → INSERT batch → LTRIM start=N
```

O uso de **lock distribuído** (SET NX) previne duplicação quando 4 queries de analytics rodam em paralelo. O `LTRIM` em vez de `DEL` garante que dados já persistidos não sejam re-inseridos mesmo em caso de falha parcial.

### 9. Cache de Slugs (Cache-Aside com Redis)

O cache de slugs segue o padrão **cache-aside**: o Redis é populado a partir do PostgreSQL e pode ser limpo sem perda de dados. O cache é invalidado automaticamente ao criar, atualizar ou deletar links (`invalidateSlug()`). O botão "Limpar Cache" no dashboard permite limpeza manual.

### 10. Cursor-Based Pagination

A listagem de links usa **cursor pagination** em vez de `OFFSET`:

- O cursor codifica `createdAt + id` em base64
- Usa `WHERE (createdAt < cursor.createdAt OR (createdAt = cursor.createdAt AND id < cursor.id))`
- Mais performático que `OFFSET` para tabelas grandes, consistente mesmo com inserts

### 11. Infinite Scroll no Frontend

A página de links admin usa **React Query** (`useInfiniteLinks`) com `IntersectionObserver` para carregar mais dados conforme o usuário rola a página — sem botão "carregar mais".

### 12. SEO & Metadados

Todas as páginas possuem metadados únicos (title, description, Open Graph, Twitter Card) via `metadata` export do Next.js App Router:

| Página | Título | Descrição |
|---|---|---|
| Home | Encurtador de URLs \| Bit Link | Encurte, compartilhe e monitore seus links |
| 404 | Página não encontrada \| Bit Link | Mensagem amigável em português |
| Admin | Admin \| Bit Link | Bloqueado para robôs (`noindex`) |
| Links | Links \| Bit Link | Gerenciamento de links |
| Analytics | Analytics \| Bit Link | Dashboard de métricas |

Recursos de SEO implementados:
- **`robots.txt`**: Permite `/`, bloqueia `/admin/`
- **`sitemap.xml`**: Gerado dinamicamente via `sitemap.ts`
- **`manifest.webmanifest`**: PWA manifest com ícones e tema escuro
- **Ícones**: Logo SVG como `icon.tsx`, `apple-icon.tsx` (180x180)
- **Open Graph + Twitter Image**: Gerados via `ImageResponse` com logo e gradiente escuro
- **JSON-LD**: Structured data `WebSite` no `<head>` do root layout
- **`theme-color`**: `#09090b` via `viewport` export
- **`lang="pt"`**: HTML lang corrigido para português
- **Home page**: Conteúdo real substituindo boilerplate Create Next App

### 13. OpenTelemetry Tracing

Cada operação crítica (resolve slug, rate limit, DB query) é instrumentada com spans OTel via `traceStep()`. Em produção (Vercel), os traces são exportados automaticamente via `@vercel/otel`.

### 14. Audit Logging

Toda operação de mutação (create/update/delete link) registra um evento na tabela `audit_log` com ação, entidade, payload before/after e IP de origem. Também há um sistema de audit em tempo de requisição via `createAudit()` que loga eventos estruturados no console.

---

[← README](README.md) · [Arquitetura →](arquitetura.md)
