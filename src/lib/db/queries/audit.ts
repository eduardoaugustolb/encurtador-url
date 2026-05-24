import "server-only";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

interface AuditInput {
  action: string;
  entityType: string;
  entityId: string;
  payload?: Record<string, unknown>;
  ip?: string;
}

export async function recordAudit(input: AuditInput) {
  try {
    await db.insert(auditLog).values({
      id: `audit_${crypto.randomUUID()}`,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      payload: input.payload ?? null,
      ip: input.ip ?? null,
      createdAt: new Date(),
    });
  } catch {
    console.error("audit.error", input.action, input.entityId);
  }
}
