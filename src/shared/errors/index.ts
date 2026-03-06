export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient balance: required ${required}, available ${available}`,
      400,
      'INSUFFICIENT_BALANCE'
    );
    this.name = 'InsufficientBalanceError';
  }
}

export class BettingClosedError extends AppError {
  constructor(roundId: string) {
    super(`Betting is closed for round ${roundId}`, 400, 'BETTING_CLOSED');
    this.name = 'BettingClosedError';
  }
}

export class ExposureLimitExceededError extends AppError {
  constructor(currentExposure: number, maxExposure: number) {
    super(
      `Exposure limit exceeded: current ${currentExposure}, max ${maxExposure}`,
      400,
      'EXPOSURE_LIMIT_EXCEEDED'
    );
    this.name = 'ExposureLimitExceededError';
  }
}

export class InvalidBetError extends AppError {
  constructor(reason: string) {
    super(`Invalid bet: ${reason}`, 400, 'INVALID_BET');
    this.name = 'InvalidBetError';
  }
}

export class DuplicateBetError extends AppError {
  constructor(userId: string, roundId: string) {
    super(
      `User ${userId} already has a bet in round ${roundId}`,
      400,
      'DUPLICATE_BET'
    );
    this.name = 'DuplicateBetError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid authentication') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends AppError {
  constructor() {
    super('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMIT');
    this.name = 'RateLimitError';
  }
}

export class RoundNotFoundError extends AppError {
  constructor(roundId: string) {
    super(`Round ${roundId} not found`, 404, 'ROUND_NOT_FOUND');
    this.name = 'RoundNotFoundError';
  }
}

/**
 * Wraps an error handler for API routes
 */
export function handleApiError(error: unknown): { message: string; status: number; code: string } {
  if (error instanceof AppError) {
    return { message: error.message, status: error.statusCode, code: error.code };
  }
  console.error('Unhandled error:', error);
  return { message: 'Internal server error', status: 500, code: 'INTERNAL_ERROR' };
}
