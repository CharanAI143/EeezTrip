import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
// Namespace import on purpose. The package is CommonJS with __esModule set, so
// a default import resolves to `.default`, which only carries the legacy API —
// and its `configs` object is empty, so `configs['flat/recommended']` was
// undefined. The flat-config entry point is a named `flatRecommended`.
import * as firebaseSecurityRules from '@firebase/eslint-plugin-security-rules';

// Everything below is JavaScript or TypeScript. Firestore rule files are a
// different language and must not be parsed as JS — scoping the base config
// this way stops `js.configs.recommended` from throwing on firestore.rules.
const JS_FILES = ['**/*.{js,mjs,cjs,jsx,ts,tsx}'];

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },

  {
    files: JS_FILES,
    ...js.configs.recommended,
  },
  // typescript-eslint v8 exposes `recommended` as an array of three configs, so
  // it has to be spread at the top level of the array rather than into an
  // object — otherwise its numeric keys leak in as invalid config keys.
  ...tseslint.configs.recommended,

  // The previous config referenced `configs['flat/recommended']`, which this
  // package does not export — the entry point is `flatRecommended`, which is a
  // single config object that already scopes itself to **/*.rules. Its rules
  // (no-open-reads, no-open-writes) are rules-language rules, so they must
  // never be applied to TypeScript.
  firebaseSecurityRules.flatRecommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // 62 pre-existing `any` annotations across the codebase, and tsconfig
      // still has strict: false. Kept as a warning so the debt stays visible
      // and countable instead of blocking every commit, until someone signs
      // up to remove them file by file.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  {
    files: ['public/sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },

  {
    files: ['**/*.{test,spec}.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: { globals: globals.node },
  },
);
