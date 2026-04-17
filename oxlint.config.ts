import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import next from "ultracite/oxlint/next";

export default defineConfig({
  extends: [
    core,
    react,
    next,
  ],
});
