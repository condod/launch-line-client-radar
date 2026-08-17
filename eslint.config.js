import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['.tmp-chrome*/**', 'dist/**', 'server-dist/**', 'server-data/**', 'node_modules/**', 'standalone.html', 'data/**', 'exports/**', 'qa-*.png']
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        caches: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        Promise: 'readonly',
        process: 'readonly',
        self: 'readonly',
        URL: 'readonly'
      }
    }
  },
  {
    files: ['scripts/qa-call-center.mjs'],
    languageOptions: {
      globals: {
        document: 'readonly',
        getComputedStyle: 'readonly',
        window: 'readonly'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        Blob: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
        process: 'readonly',
        window: 'readonly'
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.server.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off'
    }
  }
);
