import "server-only";
import type { Attributes } from "@opentelemetry/api";
import { trace } from "@opentelemetry/api";

const tracer = trace.getTracer("encurtador-url");

export async function traceStep<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Attributes,
): Promise<T> {
  const span = tracer.startSpan(name, { attributes });
  const start = performance.now();
  try {
    const result = await fn();
    span.end();
    const duration = performance.now() - start;
    console.log(
      JSON.stringify({
        type: "telemetry",
        span: name,
        durationMs: Math.round(duration * 100) / 100,
        ...attributes,
      }),
    );
    return result;
  } catch (err) {
    span.recordException(err as Error);
    span.setStatus({ code: 2, message: (err as Error).message });
    span.end();
    const duration = performance.now() - start;
    console.log(
      JSON.stringify({
        type: "telemetry",
        span: name,
        durationMs: Math.round(duration * 100) / 100,
        error: (err as Error).message,
        ...attributes,
      }),
    );
    throw err;
  }
}
