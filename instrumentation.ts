import { env } from "@/lib/env";
import { init } from "@sentry/nextjs";

const opts = {
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
};

export const register = () => {
  if (env.NEXT_RUNTIME === "nodejs") {
    init(opts);
  }

  if (env.NEXT_RUNTIME === "edge") {
    init(opts);
  }
};
