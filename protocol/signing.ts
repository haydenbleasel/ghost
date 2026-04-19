export interface CanonicalPayload {
  method: string;
  path: string;
  timestamp: string;
  nonce: string;
  body: string;
}

export const canonicalize = (input: CanonicalPayload): string =>
  [input.method.toUpperCase(), input.path, input.timestamp, input.nonce, input.body].join("\n");

export const toBase64Url = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
};

export const fromBase64Url = (s: string): Uint8Array => {
  const padded = s
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(s.length + ((4 - (s.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return bytes;
};
