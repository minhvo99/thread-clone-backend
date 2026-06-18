import globals from "globals";
import tseslint from "typescript-eslint";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
import eslintPluginPrettier from "eslint-plugin-prettier";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    languageOptions: {
      globals: globals.browser,
    },
  },

  tseslint.configs.recommended,

  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
  },

  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prettier/prettier": "warn",
    },
    ignores: ["**/node_modules/**", "**/dist/**"],
  },
]);
