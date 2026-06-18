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
            globals: globals.browser,
        },

        plugins: {
            'unused-imports': unusedImports,
        },

        rules: {
            // duplicate import
            'no-duplicate-imports': 'warn',

            // unused import
            'unused-imports/no-unused-imports': 'warn',
        },
    },

    {
        files: ['**/*.{ts,mts,cts}'],

        rules: {
            // disable default rule
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',

            // unused variable
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

            // any
            '@typescript-eslint/no-explicit-any': 'warn',

            // useful TS warnings
            '@typescript-eslint/no-empty-object-type': 'warn',
            '@typescript-eslint/no-require-imports': 'warn',
            '@typescript-eslint/no-inferrable-types': 'off',
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
     * MUST BE LAST
     * Disable all ESLint formatting rules
     * that conflict with Prettier
     */
    eslintConfigPrettier,
]);
