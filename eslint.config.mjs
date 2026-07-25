import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import globals from 'globals';

export default [
  {
    ignores: ['src/docs/**', 'main.js', 'esbuild.config.mjs', 'version-bump.mjs'],
  },
  js.configs.recommended,
  ...tsPlugin.configs['flat/recommended'],
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.es2015,
        ...globals.node,
        ...globals.jest,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
    },
    settings: {
      react: {
        version: '16.13',
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'linebreak-style': ['error', 'unix'],
      indent: 'off',
      quotes: 'off',
    },
  },
];
