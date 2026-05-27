import { mock } from "bun:test";
import {
  createMockRedis,
  createMockDb,
  type MockRedisClient,
  type MockDbClient,
} from "./mocks";

process.env.DATABASE_URL = "postgresql://localhost:5432/test";
process.env.REDIS_URL = "redis://localhost:6379";
process.env.ADMIN_PASSWORD = "test-password-1234";
process.env.ADMIN_SECRET = "test-secret-that-is-at-least-32-chars-long!!";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

mock.module("server-only", () => ({}));

const mockRedis: MockRedisClient = createMockRedis();
const mockDb: MockDbClient = createMockDb();

globalThis.__mockRedis = mockRedis;
globalThis.__mockDb = mockDb;

mock.module("ioredis", () => ({
  default: mock(() => globalThis.__mockRedis),
}));

mock.module("@/lib/db", () => ({
  db: globalThis.__mockDb,
}));
