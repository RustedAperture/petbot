import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { fixupConfigRules } from "@eslint/compat";
import { baseRules, tsRules } from "../../eslint.config.base.js";

const eslintConfig = defineConfig([
  // Wrap eslint-config-next configs so their bundled eslint-plugin-react
  // works with ESLint 10 (which removed context.getFilename()).
  ...fixupConfigRules(nextVitals),
  ...fixupConfigRules(nextTs),
  // Shared base rules from the root config.
  { rules: baseRules },
  // TypeScript rules — plugin is already registered by eslint-config-next/typescript.
  { files: ["**/*.{ts,tsx}"], rules: tsRules },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
