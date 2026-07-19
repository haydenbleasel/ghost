export class MissingProviderCredentialsError extends Error {
  constructor() {
    super("Provider credentials not configured");
    this.name = "MissingProviderCredentialsError";
  }
}
