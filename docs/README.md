# Bit Link — Documentação do Projeto

**Bit Link** é um encurtador de URL com analytics, feito com Next.js 16, PostgreSQL, Redis, e Drizzle ORM.

## Índice

| Doc | O que cobre |
|---|---|
| [Visão Geral](visao-geral.md) | Conceitos, propósito, decisões técnicas |
| [Arquitetura](arquitetura.md) | Stack, estrutura de pastas, diagramas |
| [Fluxo de Dados](fluxo-de-dados.md) | Redirect, login, CRUD, analytics passo a passo |
| [Banco de Dados](banco-de-dados.md) | Schema, índices, queries principais |
| [Processos em Background](processos-background.md) | Tracking de cliques, cache, wipe cache |

## Quick Start

```bash
bun install
bunx drizzle-kit migrate
bun run dev
```

## Scripts

| Comando | Descrição |
|---|---|
| `bun run dev` | Inicia dev server |
| `bun run build` | Build de produção |
| `bun run start` | Inicia produção |
| `bun run lint` | Biome check |
| `bun run format` | Biome format |
| `bun run test` | Bun test |

## Stack principal

- **Next.js 16** — App Router, Server Components, React 19
- **tRPC v11** — API type-safe (substitui Route Handlers)
- **Drizzle ORM** — Type-safe SQL, schema declarativo
- **Redis (ioredis)** — Cache de slugs, rate limiter, buffer de clicks
- **PostgreSQL** — Dados persistentes
- **JWT (jose)** — Sessão admin stateless
- **TanStack Query v5** — Data fetching no cliente (via tRPC)
- **Tailwind v4** — Estilização
- **shadcn/ui** — Componentes headless
- **Recharts** — Gráficos de analytics
- **GSAP** — Animações de entrada no dashboard

---

**[Visão Geral →](visao-geral.md)**
