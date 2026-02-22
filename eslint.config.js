import js from "@eslint/js";
import globals from "globals";
import { baseRules, tsConfig } from "./eslint.config.base.js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        // ESM globals below are available via import.meta and URL APIs
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
      },
    },
    rules: baseRules,
  },
  {
    files: ["migrations/*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
        require: "readonly",
        module: "readonly",
        exports: "readonly",
      },
      ecmaVersion: "latest",
      sourceType: "commonjs",
    },
    rules: {},
  },
  // TypeScript-specific rules: prefer @typescript-eslint for unused vars
  tsConfig,
  {
    ignores: [
      "node_modules/**",
      "apps/web/**",
      "data/**",
      ".idea/**",
      ".vscode/**",
      ".next/**",
      "dist/**",
      "coverage/**",
    ],
  },
];
