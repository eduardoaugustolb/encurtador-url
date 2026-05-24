# Processos em Background

O Bit Link **não tem** um sistema de filas dedicado (Bull, RabbitMQ, etc.). O processamento em background usa **Redis como buffer temporário** com flush confiável para PostgreSQL.

## Pipeline de Tracking de Cliques

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 80}}}%%
flowchart TB
    subgraph Redirect["① Redirect (tempo real)"]
        direction LR
        A["Usuário acessa /slug"] --> B["307 Redirect"]
        B -.-> C["after() callback"]
    end

    subgraph Buffer["② Redis Buffer"]
        direction TB
        C --> D["LPUSH clicks:buffer"]
        D --> E["LTRIM 0 4999"]
        E --> F["Redis List<br/>máx 5.000 eventos"]
    end

    subgraph Flush["③ Flush (sob demanda)"]
        direction TB
        G["Admin acessa analytics"] --> L["acquireLock()<br/>SET NX PX 30s"]
        L -->|"Lock adquirido"| H["flushClickBuffer()"]
        L -->|"Lock ocupado"| Z["skip (outro flush<br/>já está rodando)"]
        H --> I["LRANGE clicks:buffer"]
        I --> J["INSERT batch no PG"]
        J --> K["LTRIM clicks:buffer N -1"]
        K --> R["releaseLock()<br/>DEL lock"]
    end

    subgraph Storage["④ Dados Persistentes"]
        M[("PostgreSQL<br/>tabela clicks")]
    end

    F --> H
    K --> M
```

## Lock Distribuído (Proteção Contra Flushes Concorrentes)

O `flushClickBuffer()` é chamado por **4 queries diferentes** (`getAnalyticsSummary`, `getClicksOverTime`, `getTopLinks`, `getTopReferrers`) que rodam em paralelo via `Promise.all` — tanto no SSR da página de analytics quanto no cliente quando o dashboard faz 4 `fetch()` simultâneos.

Sem proteção, todas as 4 chamadas leem o mesmo `LRANGE` e todas fazem `INSERT` no PostgreSQL, resultando em **cada click replicado 4 vezes**.

A proteção usa um **lock distribuído no Redis**:

```typescript
async function acquireLock(): Promise<boolean> {
  const ok = await redis.set(LOCK_KEY, "1", "PX", 30_000, "NX");
  return ok === "OK";
}
```

- `SET NX`: só um caller adquire o lock por vez
- `PX 30000`: TTL de 30s evita deadlock se o processo crashar
- `DEL` no `finally`: libera o lock ao terminar
- Se o lock não for adquirido (`acquired === false`), a chamada retorna sem fazer nada

## Por que LTRIM em vez de DEL?

No modelo anterior, `flushClickBuffer()` usava `DEL clicks:buffer` após o INSERT. Isso causava dois problemas:

1. **Race condition**: se um novo click chegasse via `after()` entre o `LRANGE` e o `DEL`, ele era perdido
2. **Re-inserção**: se o INSERT falhasse parcialmente, o buffer não era limpo e na próxima tentativa os mesmos dados eram re-inseridos

A solução é usar `LTRIM clicks:buffer N -1` (onde N = quantidade lida). Isso:
- Remove **apenas** os registros que foram lidos e processados
- Preserva clicks que chegaram concorrentemente
- Se o INSERT falhar, os dados permanecem no buffer para retry

```typescript
// flush-clicks.ts
const raw = await redis.lrange(BUFFER_KEY, 0, -1);
if (raw.length === 0) return;

const records = raw.map(parseEntry);
await db.insert(clicks).values(records);
await redis.ltrim(BUFFER_KEY, raw.length, -1);
//       ↑ só remove os N processados
```

## Código Principal

### trackClick (src/lib/analytics/track.ts)

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 70}}}%%
flowchart TB
    A["trackClick(linkId, Request)"] --> B{"slug<br/>resolvido?"}

    B -->|Não| Z["return (silencioso)"]

    B -->|Sim| C["Extrair referrer<br/>do header"]
    C --> D["Calcular uaHash<br/>(SHA-256 do UA)"]

    D --> E1["Gerar nanoid"]
    D --> E2["Montar payload JSON<br/>{ linkId, clickedAt,<br/>  referrer, uaHash }"]

    E1 --> F
    E2 --> F

    F["Pipeline Redis<br/>LPUSH + LTRIM"]
    F --> G["exec() fire-and-forget<br/>captura erro com .catch()"]
```

```typescript
// Simplificado
const pipeline = redis.pipeline();
pipeline.lpush(bufferKey, JSON.stringify(clickEvent));
pipeline.ltrim(bufferKey, 0, MAX_BUFFER_SIZE - 1);
pipeline.exec().catch(() => {});
```

### flushClickBuffer (src/lib/analytics/flush-clicks.ts)

```mermaid
%%{init: {'flowchart': {'nodeSpacing': 50, 'rankSpacing': 70}}}%%
flowchart TB
    A["flushClickBuffer()"] --> L["acquireLock()<br/>SET NX PX 30000"]

    L -->|"false (lock ocupado)"| S["return<br/>skip"]
    L -->|"true"| B["LRANGE clicks:buffer"]

    B --> C{"Tem eventos<br/>no buffer?"}

    C -->|Não| F["return<br/>nada a fazer"]

    C -->|Sim| D["Parse JSON<br/>+ gerar nanoid"]
    D --> E["db.insert(clicks)<br/>.values(...)"]

    E -->|Sucesso| G["LTRIM clicks:buffer N -1"]
    G --> H["releaseLock()<br/>DEL lock"]

    E -->|Erro| I["releaseLock()<br/>DEL lock<br/>(dados ficam no Redis)"]
```

## E se...?

| Cenário | O que acontece |
|---|---|
| Redis cai durante redirect | `trackClick` falha silenciosamente → click perdido, mas redirect funciona |
| Redis cai durante flush | Erro logado, dados ficam no Redis até próxima tentativa |
| PG cai durante flush | Erro logado, buffer Redis mantém dados |
| Quatro flushes simultâneos (4× Promise.all) | Lock distribuído: só o primeiro adquire, os outros 3 pulam. Sem duplicação |
| Lock expira (processo lento >30s) | Outro caller adquire o lock e faz flush. Pode haver duplicação marginal |
| Buffer chega a 5000 | `LTRIM` no `trackClick` mantém só os 5000 mais recentes |
| Tabela clicks truncada | Buffer pode ter dados não-flushados ainda (correto — serão persistidos) |

## Cache de Slugs (Wipe Cache)

O cache de slugs (`slug:*` no Redis) segue o padrão **cache-aside**: o Redis é populado a partir do PostgreSQL e pode ser limpo sem perda.

O botão **"Limpar Cache"** no dashboard chama `POST /api/cache/wipe`, que executa `clearSlugCache()` (SCAN + DEL nos `slug:*`). Na próxima requisição, o cache é repopulado automaticamente via `resolveSlug()`.

`invalidateSlug()` é chamado automaticamente ao criar, atualizar ou deletar links.

---

[← Banco de Dados](banco-de-dados.md) · [README →](README.md)
