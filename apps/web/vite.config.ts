import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./$1", import.meta.url)),
      },
      {
        find: "@petbot/constants",
        replacement: fileURLToPath(
          new URL("../../src/types/constants", import.meta.url),
        ),
      },
    ],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: "tests/setup-tests.ts",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/data/**"],
    css: false,
  },
});
