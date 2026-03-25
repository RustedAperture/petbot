import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const stub = (name: string) =>
  fileURLToPath(new URL(`./tests/web/__mocks__/${name}`, import.meta.url));
const rootPkg = (pkg: string) =>
  fileURLToPath(new URL(`./node_modules/${pkg}`, import.meta.url));

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./apps/web/$1", import.meta.url)),
      },
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
    setupFiles: "tests/web/setup-tests.ts",
    include: ["tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/data/**",
      "apps/web/**",
      "tests/web/**",
    ],
    // Array form with regex find-values ensures exact matching (not prefix).
    // resolve.dedupe only applies to the browser bundler, not Vitest's
    // server-side module runner, so we use explicit aliases here to force
    // all packages to share the same root React instance.
    alias: [
      // Next.js stubs (apps/web/node_modules/next uses its own React copy)
      { find: "next/image", replacement: stub("next-image.tsx") },
      { find: "next/link", replacement: stub("next-link.tsx") },
      { find: "next/navigation", replacement: stub("next-navigation.ts") },
      // Always report mobile=true so sidebar tests work without vi.mock gymnastics.
      // Only changelog and app-sidebar tests use this hook and both need isMobile=true.
      {
        find: /^.*\/use-mobile(\.[a-z]+)?$/,
        replacement: stub("use-mobile.ts"),
      },
      // React deduplication — exact-match regex prevents prefix substitution
      { find: /^react$/, replacement: rootPkg("react/index.js") },
      {
        find: /^react\/jsx-runtime$/,
        replacement: rootPkg("react/jsx-runtime.js"),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: rootPkg("react/jsx-dev-runtime.js"),
      },
      { find: /^react-dom$/, replacement: rootPkg("react-dom/index.js") },
      {
        find: /^react-dom\/client$/,
        replacement: rootPkg("react-dom/client.js"),
      },
    ],
    server: {
      deps: {
        // Force Vite to process packages from apps/web/node_modules so that
        // the react aliases above apply and all code shares the same instance.
        inline: [/\/apps\/web\/node_modules\//],
      },
    },
  },
});
