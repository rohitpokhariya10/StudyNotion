import js from "@eslint/js"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import globals from "globals"

const directApiImportRestrictions = [
  "error",
  {
    paths: [
      {
        name: "axios",
        message:
          "Page and UI code must use an entity or feature API boundary instead of Axios directly.",
      },
    ],
    patterns: [
      {
        group: [
          "**/services/apiConnector",
          "**/services/apiConnector.js",
          "**/shared/api/httpClient",
          "**/shared/api/httpClient.js",
        ],
        message:
          "Page and UI code must use an entity or feature API boundary instead of the HTTP connector directly.",
      },
    ],
  },
]

export default [
  {
    ignores: [
      "**/dist/**",
      "**/build/**",
      "**/node_modules/**",
      "**/blob-report/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "**/test-results/**",
    ],
  },
  {
    files: ["apps/web/src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: "module",
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      "react/button-has-type": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-vars": "error",
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: [
      "apps/api/**/*.js",
      "packages/contracts/{src,test}/**/*.js",
      "scripts/**/*.cjs",
      "e2e/**/*.cjs",
      "*.{js,cjs}",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: globals.node,
      sourceType: "commonjs",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: [
      "apps/web/test/**/*.js",
      "apps/web/scripts/**/*.mjs",
      "scripts/**/*.mjs",
      "e2e/**/*.js",
      "*.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      globals: { ...globals.browser, ...globals.node },
      sourceType: "module",
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: [
      "apps/web/src/app/**/*.{js,jsx}",
      "apps/web/src/pages/**/*.{js,jsx}",
      "apps/web/src/widgets/**/*.{js,jsx}",
      "apps/web/src/features/*/ui/**/*.{js,jsx}",
      "apps/web/src/entities/*/ui/**/*.{js,jsx}",
      "apps/web/src/shared/ui/**/*.{js,jsx}",
    ],
    rules: {
      "no-restricted-imports": directApiImportRestrictions,
    },
  },
  {
    // Compatibility tests may inspect both sides of a transport adapter.
    files: ["apps/web/src/app/composition.test.jsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]
