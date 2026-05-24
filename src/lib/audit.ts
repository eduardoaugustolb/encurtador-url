import "server-only";
import { randomUUID } from "node:crypto";

let moduleLoadCount = 0;
moduleLoadCount++;

type AuditMeta = Record<string, unknown>;

export function auditEvent(
  requestId: string,
  event: string,
  meta?: AuditMeta,
) {
  console.log(
    JSON.stringify({
      audit: true,
      event,
      requestId,
      moduleLoadSeq: moduleLoadCount,
      ts: Date.now(),
      ...meta,
    }),
  );
}

const pid = process.pid;
const nodeEnv = process.env.NODE_ENV;

export function createAudit() {
  const requestId = randomUUID();
  auditEvent(requestId, "audit.module.init", { pid, nodeEnv });
  return {
    requestId,
    audit: (event: string, meta?: AuditMeta) =>
      auditEvent(requestId, event, meta),
  };
}
