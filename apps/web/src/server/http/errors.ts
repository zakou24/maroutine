// Ressource absente, ou appartenant à un autre utilisateur : on ne confirme pas son existence.
export class NotFoundError extends Error {
  constructor(message = "not_found") {
    super(message);
    this.name = "NotFoundError";
  }
}
