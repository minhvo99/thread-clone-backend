import globals from 'globals';
import tseslint from 'typescript-eslint';
import json from '@eslint/json';
import unusedImports from 'eslint-plugin-unused-imports';
import eslintConfigPrettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    {
        ignores: ['**/node_modules/**', '**/dist/**', 'src/generated/**'],
    },

    ...tseslint.configs.recommended,

    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2024,
            },
        },

        plugins: {
            'unused-imports': unusedImports,
        },

        rules: {
            // Duplicate imports
            'no-duplicate-imports': 'warn',

            // Unused imports
            'unused-imports/no-unused-imports': 'warn',
        },
    },

    {
        files: ['**/*.{ts,mts,cts}'],

        rules: {
            // Disable default unused-vars rules
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',

            // Warn unused variables
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                    caughtErrors: 'all',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],

            // TypeScript quality rules
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-require-imports': 'warn',
            '@typescript-eslint/ban-ts-comment': 'warn',
        },
    },

    {
        files: ['**/*.json'],
        plugins: {
            json,
        },
        language: 'json/json',
    },

    /**
     * IMPORTANT:
     * Must be last.
     * Disables all ESLint formatting rules
     * that conflict with Prettier.
     */
    eslintConfigPrettier,
]);
