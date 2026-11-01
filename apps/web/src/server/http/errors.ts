// Ressource absente, ou appartenant à un autre utilisateur : on ne confirme pas son existence.
export class NotFoundError extends Error {
  constructor(message = "not_found") {
    super(message);
    this.name = "NotFoundError";
  }
}

// Erreurs de requête qui portent leur code de réponse : { error: code }.
export class BadRequestError extends Error {
  readonly status: number = 400;
  constructor(readonly code: string) {
    super(code);
    this.name = "BadRequestError";
  }
}

export class ConflictError extends BadRequestError {
  override readonly status = 409;
  constructor(code: string) {
    super(code);
    this.name = "ConflictError";
  }
}

export class UnsupportedMediaTypeError extends BadRequestError {
  override readonly status = 415;
  constructor() {
    super("unsupported_media_type");
    this.name = "UnsupportedMediaTypeError";
  }
}

// Action refusée à cette session (compte démo sur la recherche d'aliments, T-09).
export class ForbiddenError extends BadRequestError {
  override readonly status = 403;
  constructor(code: string) {
    super(code);
    this.name = "ForbiddenError";
  }
}

// Trop d'appels à Open Food Facts pour cette session (T-09).
export class TooManyRequestsError extends BadRequestError {
  override readonly status = 429;
  constructor(code = "rate_limited") {
    super(code);
    this.name = "TooManyRequestsError";
  }
}

// Service externe en panne ou trop lent (Open Food Facts).
export class ServiceUnavailableError extends BadRequestError {
  override readonly status = 503;
  constructor(code: string) {
    super(code);
    this.name = "ServiceUnavailableError";
  }
}
