import "server-only";
import { db, type DB } from "@/lib/db";
import { auditLog } from "@/lib/db/schema";

export interface IAuditRepository {
  record(input: {
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ip?: string;
  }): Promise<void>;
}

export class AuditRepository implements IAuditRepository {
  constructor(private db: DB) {}

  async record(input: {
    action: string;
    entityType: string;
    entityId: string;
    payload?: Record<string, unknown>;
    ip?: string;
  }) {
    try {
      await this.db.insert(auditLog).values({
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
}

export const auditRepository = new AuditRepository(db);
