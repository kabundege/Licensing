export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 500,
    public readonly isOperational = true
  ) {
    super(message);
    this.name = `AppError`;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** Spec: treat missing/invalid credentials as 403 for consistent portal responses. */
  static unauthorized = (message = `Unauthorized`): AppError =>
    new AppError(`UNAUTHORIZED`, message, 403);

  static conflict = (message = `Conflict`): AppError =>
    new AppError(`CONFLICT`, message, 409);

  static badRequest = (message = `Bad Request`): AppError =>
    new AppError(`BAD_REQUEST`, message, 400);

  static notFound = (message = `Route not found`): AppError =>
    new AppError(`NOT_FOUND`, message, 404);
}
