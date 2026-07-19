import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next],
  ignorePatterns: [
    "components/ui",
    "components/ai-elements",
    "components/kibo-ui",
    "lib/utils.ts",
    "lib/providers/hetzner/schema.ts",
    "hooks/use-mobile.ts",
  ],
  rules: {
    // Sequential awaits in loops are this codebase's core shape: the agent's
    // long-poll/backoff loops, workflow polling, ordered command execution,
    // and SSE streaming all await intentionally inside loops.
    "eslint/no-await-in-loop": "off",
    // Recharts tooltips take inline render functions as props (formatter,
    // labelFormatter) — the standard idiom for that library.
    "react/no-unstable-nested-components": ["error", { allowAsProps: true }],
  },
});
