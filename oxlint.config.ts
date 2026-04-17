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
    "hooks/use-mobile.ts",
  ],
});
