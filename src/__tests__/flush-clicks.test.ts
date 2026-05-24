import { describe, test, expect } from "bun:test";
import { flushClickBuffer } from "@/lib/analytics/flush-clicks";

describe("flushClickBuffer", () => {
  test("is a no-op — clicks are written directly to postgres", async () => {
    await expect(flushClickBuffer()).resolves.toBeUndefined();
  });
});
