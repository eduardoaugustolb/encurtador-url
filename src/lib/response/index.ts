export class SuccessResponse<T = unknown> {
  readonly success = true;
  readonly timestamp: string;

  constructor(
    readonly data: T,
    readonly meta?: Record<string, unknown>,
  ) {
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: true,
      data: this.data,
      ...(this.meta && { meta: this.meta }),
      timestamp: this.timestamp,
    };
  }
}

export class ErrorResponse {
  readonly success = false;
  readonly timestamp: string;

  constructor(
    readonly error: { code: string; message: string; details?: unknown },
  ) {
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: false,
      error: this.error,
      timestamp: this.timestamp,
    };
  }
}
