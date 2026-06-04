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

O SEO do projeto é **centrado no proprietário**, não no wrapper BitLink. Títulos, descrições e
imagens Open Graph/Twitter são derivados do arquivo `src/lib/constants.ts`, que contém
os dados do dono (`OWNER`), do wrapper (`SITE`) e as configs de SEO (`SEO`).

O template de título é `%s | ${OWNER.name}`, garantindo que toda página filho exiba
o nome do proprietário como autoridade:

| Página | Título | Descrição |
|---|---|---|
| Home (Link Three) | Nome do Dono | Bio do dono |
| 404 | Página não encontrada \| Nome do Dono | Mensagem amigável em português |
| Admin | Admin \| Nome do Dono | Bloqueado para robôs (`noindex`) |

**Princípio:** O BitLink é apenas o motor tecnológico. Quem clonar este repositório
deve editar apenas `src/lib/constants.ts` com seus próprios dados — o SEO refletirá
o novo dono automaticamente.

Recursos de SEO implementados:
- **`robots.txt`**: Permite `/`, bloqueia `/admin/`
- **`sitemap.xml`**: Gerado dinamicamente via `sitemap.ts`
- **`manifest.webmanifest`**: PWA manifest com nome do dono e tema escuro
- **Ícones**: Logo SVG como `icon.tsx`, `apple-icon.tsx` (180x180)
- **Open Graph + Twitter Image**: Gerados via `ImageResponse` com iniciais do dono
- **JSON-LD**: Structured data `WebSite` no `<head>` do root layout
- **`theme-color`**: `#09090b` via `viewport` export
- **`lang="pt"`**: HTML lang corrigido para português
- **Home page**: Link Three com links configuráveis do proprietário
- **`src/lib/constants.ts`**: Arquivo único de configuração — edite para personalizar

### 13. OpenTelemetry Tracing

Cada operação crítica (resolve slug, rate limit, DB query) é instrumentada com spans OTel via `traceStep()`. Em produção (Vercel), os traces são exportados automaticamente via `@vercel/otel`.

### 14. Audit Logging

Toda operação de mutação (create/update/delete/reorder link) registra um evento na tabela `audit_log` com ação, entidade, payload before/after e IP de origem. O reorder também audita os itens reordenados (ids + novas posições) com o IP do admin via `ctx.ip`. Também há um sistema de audit em tempo de requisição via `createAudit()` que loga eventos estruturados no console.

### 15. Link Three — Home Page do Proprietário

A rota `/` (home) funciona como uma página **Link Three** (link-in-bio) do proprietário.
Em vez de promover o BitLink, a home exibe:

- Iniciais do dono (ou avatar, se configurado)
- Nome e handle (ex: `@eduardoaugusto`)
- Biografia
- Lista de links gerenciada pelo dashboard admin
- Rodapé discreto com o nome do wrapper (BitLink)

**SEO:** O motor de busca enxerga o nome do proprietário como título principal.
O BitLink aparece apenas como informação secundária no rodapé.

**Gerenciamento via Dashboard:**
- Crie links normalmente no admin (`/admin/links`)
- Ative "Show on home page (Link Three)" no edit de cada link
- Escolha um ícone Phosphor para cada link via o seletor com busca
- Os links aparecem na home automaticamente

**Ícones:** Mais de 1500 ícones Phosphor disponíveis, todos buscáveis
pelo seletor (Popover + input de busca). O nome do ícone é armazenado
no banco (ex: `GithubLogoIcon`, `GlobeHemisphereWestIcon`).

**Para personalizar dono:** Edite `src/lib/constants.ts` — troque `OWNER.name`,
`OWNER.bio` e `OWNER.handle`.

### 16. Optimistic UI — Padrão do Projeto

Toda mutação que afeta a ordem ou visibilidade de itens no dashboard DEVE ser
otimista: o frontend reflete a mudança **antes** da resposta do servidor, e
reverte em caso de erro.

**Padrão atual (ex: reorder de links):**

1. O estado local `orderedLinks` é sincronizado com o cache do tRPC via
   `useEffect`
2. Ao arrastar um link (`handleDragEnd`):
   - `setOrderedLinks()` atualiza o estado **imediatamente** (UI otimista)
   - `reorderMutation.mutate()` dispara a requisição em paralelo
3. `onError` da mutation: restaura `orderedLinks` com dados frescos do cache
   e mostra toast de erro
4. `onSettled`: invalida a query (`refetch()`) para sincronizar estado final

**Não use** `onMutate` com `setInfiniteData` para esse padrão. Prefira um estado
local espelho (`orderedLinks`) sincronizado com o cache. É mais legível, evita
complexidade de query keys, e cobre bem os casos de rollback.

**Próximas mutações que devem seguir o padrão:**
- Create/delete/mark-active — idealmente também otimistas com rollback

### 17. Services + Repositories (Camadas de Domínio)

A lógica de negócio foi organizada em **services** e **repositories** para facilitar testes e refatorações:

- **Repositories** (`src/lib/repositories/`): Classes com constructor DI que encapsulam acesso a dados via Drizzle. Cada domain tem sua interface (`ILinkRepository`) e implementação (`LinkRepository`), permitindo mocks em testes sem `mock.module()`.
- **Services** (`src/lib/services/`): Orquestram repositórios + Redis + validadores. Lançam `DomainError` em vez de `TRPCError`, mantendo-se desacoplados do tRPC.
- **Error Mapper**: Middleware no tRPC (`errorMapper`) captura `DomainError` e converte para `TRPCError` automaticamente.
- **Response Helpers** (`src/lib/response/`): `SuccessResponse` e `ErrorResponse` para uso em route handlers REST.

**Fluxo atual:**
```
Router (tRPC) → Service → Repository → PostgreSQL
                    ↘ Redis, validators, audit
Router (tRPC) ← Service ← DomainError (convertido para TRPCError pelo errorMapper)
```

---

[← README](README.md) · [Arquitetura →](arquitetura.md)
