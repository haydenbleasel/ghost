import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    "components/ui",
    "components/ai-elements",
    "components/kibo-ui",
    "lib/utils.ts",
    "lib/hetzner/schema.ts",
    "hooks/use-mobile.ts",
  ],
});
