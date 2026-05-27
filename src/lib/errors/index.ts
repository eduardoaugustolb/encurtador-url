export class DomainError extends Error {
  readonly success = false;
  readonly timestamp: string;

  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "DomainError";
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      success: false,
      error: { code: this.code, message: this.message, details: this.details },
      timestamp: this.timestamp,
    };
  }
}

export class BadRequestError extends DomainError {
  constructor(message = "Bad request", details?: unknown) {
    super(message, "BAD_REQUEST", 400, details);
    this.name = "BadRequestError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Resource not found") {
    super(message, "NOT_FOUND", 404);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Unauthorized") {
    super(message, "UNAUTHORIZED", 401);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Forbidden") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class TooManyRequestsError extends DomainError {
  constructor(message = "Too many requests") {
    super(message, "TOO_MANY_REQUESTS", 429);
    this.name = "TooManyRequestsError";
  }
}

export class InternalError extends DomainError {
  constructor(message = "Internal server error") {
    super(message, "INTERNAL_SERVER_ERROR", 500);
    this.name = "InternalError";
  }
}
