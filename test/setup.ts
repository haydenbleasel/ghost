import { plugin } from "bun";

plugin({
  name: "stub-server-only",
  setup(build) {
    build.module("server-only", () => ({
      contents: "",
      loader: "js",
    }));
  },
  target: "bun",
});

const seed = (key: string, value: string) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
};

seed("BOOTSTRAP_JWT_SECRET", "0123456789abcdef0123456789abcdef0123");
seed("SESSION_SECRET", "fedcba9876543210fedcba9876543210fedc");
seed("AUTH_EMAIL", "owner@example.com");
seed("AUTH_PASSWORD", "correct-horse-battery");
seed("HETZNER_API_TOKEN", "test-hetzner-token");
seed("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
seed("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
seed("KV_REST_API_URL", "http://localhost:8079");
seed("KV_REST_API_TOKEN", "test-token");
