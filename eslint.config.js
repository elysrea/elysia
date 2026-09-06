import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },

  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // A no-op teardown is a meaningful return value, not an oversight.
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
    },
  },

  {
    files: ['tests/**/*.ts', 'plugins/**/*.ts', '*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Plain JS (the flat config itself, build scripts) is not part of the
  // TypeScript program, so the type-aware rules cannot run on it.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
  },

  // Build scripts report what they did; that is their whole interface.
  {
    files: ['scripts/**/*.js'],
    rules: { 'no-console': 'off' },
  },

  prettier,
);
