const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/'] },
  js.configs.recommended,
  {
    // Script pasted into the browser console on calendar.google.com
    files: ['src/console/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
  },
  {
    // Google Apps Script (V8 runtime)
    files: ['src/apps-script/**/*.gs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        CalendarApp: 'readonly',
        Utilities: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // Node: tests and tooling
    files: ['test/**/*.js', 'test-utils/**/*.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },
];
