import { mergeConfig } from "vite";
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      include: ["src/**/*.test.{ts,tsx}"],
      clearMocks: true,
      coverage: {
        provider: "v8",
        enabled: true,
        include: ["src/core/**/*.ts"],
        exclude: ["src/core/**/*.test.ts"],
        reporter: ["text", "json-summary", "html"],
        thresholds: { lines: 90, functions: 90, statements: 90, branches: 85 },
      },
    },
  }),
);
