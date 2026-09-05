import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["scripts/verify-official.test.ts"],
      setupFiles: [],
      coverage: { enabled: false },
    },
  }),
);
