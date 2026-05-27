<!-- BEGIN:mandatory-checklist -->
# ⚠️ Checklist obrigatório — execute ANTES de qualquer implementação

**TODO: Antes de começar a codificar, execute estes 3 passos em ordem:**

1. **Branch**: `git branch` — estou em uma sub branch (`feature/*`, `fix/*`)? Se estiver na `main`, PARE e crie uma branch.
2. **Docs**: Leia os arquivos relevantes em `docs/` e em `node_modules/next/dist/docs/` ANTES de escrever código novo.
3. **Commit**: Só commite na sub branch, nunca na `main`. Depois do commit, crie PR e aguarde review.

**Após implementar:** Se o comportamento do sistema mudou, atualize os `docs/` afetados.
<!-- END:mandatory-checklist -->

<!-- BEGIN:package-manager -->
# Package Manager

This project uses **bun** as the package manager. Do NOT use npm or pnpm.
- Install dependencies: `bun install`
- Add packages: `bun add <package>`
- Dev dependencies: `bun add -d <package>`
- Run scripts: `bun run <script>`
<!-- END:package-manager -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:git-workflow -->
# Git Workflow

Este projeto segue o fluxo de **branches isoladas**. Nunca trabalhe diretamente na `main`.
- Crie sempre uma **sub branch** (`feature/<nome>`, `fix/<nome>`, etc.) para trabalhar de forma isolada e segura
- Faça merge para a `main` apenas quando a funcionalidade estiver pronta e revisada (PR deve ser aprovado — nada de merge direto sem review)
- Commits devem ser feitos na sub branch, não na main
<!-- END:git-workflow -->

<!-- BEGIN:docs-sync -->
# Documentação deve refletir o código

Sempre que você alterar comportamento, arquitetura, fluxo de dados, dependências ou qualquer decisão técnica que contradiga o conteúdo de `docs/`, você DEVE atualizar os arquivos afetados em `docs/` para refletir o estado atual do código.

Regras:
- Leia os docs relevantes ANTES de começar a implementar
- Se a implementação divergir do que está documentado, atualize os docs após o código
- Se um arquivo inteiro ficar obsoleto, reescreva-o ou remova-o
- Mantenha diagramas (Mermaid) sincronizados com o código real
- `docs/README.md` lista todas as docs — mantenha a descrição precisa
- Não crie docs que não existiam, a menos que a mudança introduza um conceito novo que precise ser explicado
<!-- BEGIN:trpc-rules -->
# tRPC v11 — Regras para Agentes

Este projeto usa **tRPC v11** com superjson como camada de API, substituindo route handlers.

## Estrutura

- `src/server/trpc.ts` — Context, `adminProcedure`, `adminMutationProcedure`, `publicProcedure`
- `src/server/routers/_app.ts` — `appRouter` + `createCaller`
- `src/server/routers/<domain>.ts` — Um arquivo por domínio (auth, links, analytics, cache)
- `src/app/api/trpc/[trpc]/route.ts` — Único HTTP handler
- `src/lib/trpc/react.tsx` — `createTRPCReact` + `TRPCProvider`
- `src/lib/trpc/server.ts` — `createSSRCaller()` para Server Components

## Procedures

| Builder | Uso |
|---|---|
| `publicProcedure` | Login (rate limit manual) |
| `adminProcedure` | Queries admin (auth + rate limit 60/min) |
| `adminMutationProcedure` | Mutations admin (auth + rate limit + CSRF) |

## Client-Side

- Componentes client: `api.<router>.<procedure>.useQuery()` / `.useMutation()`
- Infinite query: `api.links.list.useInfiniteQuery()`
- SSR: `createSSRCaller()` → `caller.links.list()`
- `TRPCProvider` está no `QueryProvider`, que envolve o admin layout

## Tipos com superjson

- **Date**: superjson serializa `Date` → string no transporte e deserializa de volta para `Date` no cliente.
- **Tipos de entidade** (ex: `Link.createdAt`) devem usar `Date` no TypeScript, **não `string`**.
- **initialData**: evitar `initialData` nas queries — preferir fallback com `??` e SSR props. O tipo inferido pelo tRPC nem sempre corresponde ao formato dos dados SSR.

## O que NÃO é tRPC

- `[slug]/route.ts` — route handler de redirect (não é API)
- `proxy.ts` — auth guard Node.js
- `logoutAction` — Server Action
- `src/lib/db/queries/` — queries Drizzle (chamadas pelos routers, não expostas)
<!-- END:trpc-rules -->

<!-- END:docs-sync -->
