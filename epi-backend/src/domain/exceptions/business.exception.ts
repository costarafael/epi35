export class BusinessError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'BusinessError';
  }
}

export class ValidationError extends BusinessError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends BusinessError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends BusinessError {
  constructor(message: string) {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends BusinessError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}