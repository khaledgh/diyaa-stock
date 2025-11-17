/* eslint-env node */
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'react/display-name': 'off',
      'import/no-dynamic-require': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      'global-require': 'off',
    },
  },
]);
