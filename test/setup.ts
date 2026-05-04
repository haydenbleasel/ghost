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

seed("BETTER_AUTH_SECRET", "0123456789abcdef0123456789abcdef0123");
seed("BOOTSTRAP_JWT_SECRET", "0123456789abcdef0123456789abcdef0123");
seed("BETTER_AUTH_URL", "http://localhost:3000");
seed("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
seed("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
seed("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
seed("KV_REST_API_URL", "http://localhost:8079");
seed("KV_REST_API_TOKEN", "test-token");
seed("VERCEL_AUTOMATION_BYPASS_SECRET", "test-bypass");
