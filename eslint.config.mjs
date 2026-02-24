import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.turbo/",
      "**/.husky/",
      "**/.claude/",
      "**/routeTree.gen.ts",
    ],
  },
);
