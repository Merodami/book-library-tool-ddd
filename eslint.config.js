// eslint.config.js

import js from '@eslint/js'
import security from 'eslint-plugin-security'
import sonarjs from 'eslint-plugin-sonarjs'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettier from 'eslint-config-prettier'

export default [
  // 1) Ignored files (replaces .eslintignore)
  {
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
  },

  // 2) Base ESLint recommended + Prettier configs (flat versions)
  js.configs.recommended,
  prettier,

  // 3) General config (Node environment, plugin rules, custom rules)
  {
    // "languageOptions" is where we specify parser settings, globals, etc.
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      // If you want to allow Node globals (like "process"), add them here:
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        React: 'writable',
        window: 'writable',
        localStorage: 'writable',
        // If needed:
        process: 'readonly', // so `no-undef` won't complain about process
      },
    },

    // Register your plugins:
    plugins: {
      security,
      sonarjs,
      // Prettier is typically just a config, not a plugin
    },

    rules: {
      // Basic JS/Prettier-related
      'linebreak-style': ['error', 'unix'],
      'prefer-const': [
        'warn',
        {
          destructuring: 'all',
        },
      ],
      semi: ['error', 'never'],
      'no-prototype-builtins': 0,
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: 'next|context|req|key|i|event',
        },
      ],
      'no-trailing-spaces': 'error',
      'no-undef': 'error',
      'no-redeclare': 'off',
      'no-shadow': 'warn',

      // SonarJS rules (since we’re not using "plugin:sonarjs/recommended")
      'sonarjs/no-identical-functions': 'warn',
      'sonarjs/cognitive-complexity': 'warn',
      'sonarjs/no-nested-template-literals': 'warn',
      'sonarjs/no-duplicate-string': 'off',
      'sonarjs/no-redundant-boolean': 'warn',

      // Security plugin rules (since we’re not using "plugin:security/recommended")
      'security/detect-object-injection': 'error',
      'security/detect-non-literal-fs-filename': 'error',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'error',
      'security/detect-pseudoRandomBytes': 'warn',
    },
  },

  // 4) Override for TypeScript files
  {
    files: ['*.ts', '*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        requireConfigFile: false,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      'no-undef': 'off', // TS handles types
      'no-unused-vars': 'off', // prefer TS lint rule instead
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          ignoreRestSiblings: true,
          argsIgnorePattern: 'key|value|i|doc|next|jpath|event|params|router',
        },
      ],
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/camelcase': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-redeclare': [
        0,
        {
          ignoreDeclarationMerge: true,
        },
      ],
    },
  },

  // 5) Override for Vitest test files
  {
    files: [
      '**/*.test.js',
      '**/*.test.ts',
      '**/tests/**/*',
      '**/__mocks__/**/*',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        afterAll: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        fit: 'readonly',
        it: 'readonly',
        test: 'readonly',
        xdescribe: 'readonly',
        xit: 'readonly',
        xtest: 'readonly',
      },
    },
    rules: {
      'no-import-assign': 'off',
      'no-shadow': 'off',
    },
  },
]
