import "server-only";

export async function flushClickBuffer(): Promise<void> {
  // no-op — clicks are now written directly to PostgreSQL
}
