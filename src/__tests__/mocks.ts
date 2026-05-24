import { mock, type Mock } from "bun:test";

export interface MockRedisPipeline {
  lpush: Mock<(key: string, value: string) => MockRedisPipeline>;
  ltrim: Mock<(key: string, start: number, stop: number) => MockRedisPipeline>;
  exec: Mock<() => Promise<[Error | null, unknown][]>>;
}

export interface MockRedisClient {
  eval: Mock<(script: string, numKeys: number, ...args: string[]) => Promise<unknown>>;
  get: Mock<(key: string) => Promise<string | null>>;
  set: Mock<(key: string, value: string, ...args: string[]) => Promise<"OK" | null>>;
  setex: Mock<(key: string, seconds: number, value: string) => Promise<"OK">>;
  del: Mock<(key: string) => Promise<number>>;
  lpush: Mock<(key: string, value: string) => Promise<number>>;
  ltrim: Mock<(key: string, start: number, stop: number) => Promise<"OK">>;
  lrange: Mock<(key: string, start: number, stop: number) => Promise<string[]>>;
  ping: Mock<() => Promise<"PONG">>;
  pipeline: Mock<() => MockRedisPipeline>;
  status: string;
}

export interface MockDbInsertBuilder {
  values: Mock<(data: unknown) => Promise<unknown[]>>;
}

export interface MockDbClient {
  insert: Mock<(table: unknown) => MockDbInsertBuilder>;
  query: {
    links: {
      findFirst: Mock<
        (
          opts: unknown,
        ) => Promise<{
          id: string;
          destinationUrl: string;
          isActive: boolean;
        } | null>
      >;
    };
  };
}

declare global {
  var __mockRedis: MockRedisClient;
  var __mockDb: MockDbClient;
}

export function createMockRedis(): MockRedisClient {
  return {
    eval: mock(() => Promise.resolve([1, 1])),
    get: mock(() => Promise.resolve(null)),
    set: mock(() => Promise.resolve("OK")),
    setex: mock(() => Promise.resolve("OK")),
    del: mock(() => Promise.resolve(1)),
    lpush: mock(() => Promise.resolve(1)),
    ltrim: mock(() => Promise.resolve("OK")),
    lrange: mock(() => Promise.resolve([])),
    ping: mock(() => Promise.resolve("PONG")),
    status: "ready",
    pipeline: mock(() => createMockPipeline()),
  };
}

export function createMockPipeline(): MockRedisPipeline {
  const chain: MockRedisPipeline = {
    lpush: mock(() => chain),
    ltrim: mock(() => chain),
    exec: mock(() => Promise.resolve([])),
  };
  return chain;
}

export function createMockDb(): MockDbClient {
  return {
    insert: mock(() => ({
      values: mock(() => Promise.resolve([])),
    })),
    query: {
      links: {
        findFirst: mock(() => Promise.resolve(null)),
      },
    },
  };
}
