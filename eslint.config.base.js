/**
 * Shared ESLint base config used by both the root (bot) and apps/web configs.
 * Import this and spread the exported arrays into your own config.
 */
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

/** General style/quality rules applied to all JS/TS files. */
export const baseRules = {
  "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "no-console": "off",
  "prefer-const": "warn",
  "no-var": "error",
  eqeqeq: ["error", "always", { null: "ignore" }],
  curly: ["error", "all"],
  "brace-style": ["error", "1tbs"],
  indent: ["error", 2],
  quotes: ["error", "double", { avoidEscape: true }],
  semi: ["error", "always"],
  "no-trailing-spaces": "error",
  "comma-dangle": ["error", "always-multiline"],
  "object-curly-spacing": ["error", "always"],
  "array-bracket-spacing": ["error", "never"],
};

/** TypeScript-specific rules (no plugin/parser registration — use when the
 *  plugin is already registered by another config, e.g. eslint-config-next). */
export const tsRules = {
  "no-undef": "off",
  "no-unused-vars": "off",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
  ],
};

/** Full TypeScript config block including parser and plugin registration.
 *  Use this in configs that don't already load @typescript-eslint. */
export const tsConfig = {
  files: ["**/*.{ts,tsx}"],
  languageOptions: {
    parser: tsParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
  plugins: {
    "@typescript-eslint": tsPlugin,
  },
  rules: tsRules,
};
