import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...(ultracite.ignorePatterns ?? []),
    // Hand-formatted for GitHub: [!NOTE] alerts and HTML tables that the
    // markdown formatter would mangle.
    "README.md",
    "components/ui",
    "components/ai-elements",
    "components/kibo-ui",
    "lib/utils.ts",
    "lib/providers/hetzner/schema.ts",
    "hooks/use-mobile.ts",
  ],
});
