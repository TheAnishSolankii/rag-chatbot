import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        window: 'readonly', document: 'readonly', navigator: 'readonly',
        console: 'readonly', fetch: 'readonly', URL: 'readonly',
        localStorage: 'readonly', sessionStorage: 'readonly',
        setTimeout: 'readonly', clearTimeout: 'readonly',
        setInterval: 'readonly', clearInterval: 'readonly',
        Promise: 'readonly', FormData: 'readonly', Blob: 'readonly',
        TextDecoder: 'readonly', ReadableStream: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      'react-hooks':    reactHooks,
      'react-refresh':  reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console':     ['warn', { allow: ['warn', 'error'] }],
      'prefer-const':   'error',
      'no-var':         'error',
    },
  },
]
