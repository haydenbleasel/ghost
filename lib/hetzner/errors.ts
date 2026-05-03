export class MissingHetznerCredentialsError extends Error {
  constructor() {
    super("Hetzner credentials not configured");
    this.name = "MissingHetznerCredentialsError";
  }
}
