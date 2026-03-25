import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@utils\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./src/utilities/$1", import.meta.url),
        ),
      },
      {
        find: /^@components\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./src/components/$1", import.meta.url),
        ),
      },
      {
        find: /^@commands\/(.*)$/,
        replacement: fileURLToPath(
          new URL("./src/commands/$1", import.meta.url),
        ),
      },
      {
        find: /^@types\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/types/$1", import.meta.url)),
      },
      {
        find: /^@db\/(.*)$/,
        replacement: fileURLToPath(new URL("./src/db/$1", import.meta.url)),
      },
      {
        find: /^@logger$/,
        replacement: fileURLToPath(new URL("./src/logger.js", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/data/**", "apps/web/**"],
  },
});
