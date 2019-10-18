module.exports = {
  env: {
    browser: true,
    es6: true,
  },
  extends: 'airbnb-base',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  rules: {
    'no-plusplus': 0,
    'no-console': 0,
    'no-underscore-dangle': 0,
    'max-len': 0,
    'no-prototype-builtins': 0,
    'import/prefer-default-export': 0,
    'linebreak-style': 0,
    'key-spacing': 0,
    'guard-for-in': 0,
    'no-multi-spaces': 0,
    'no-param-reassign': 0,
    'no-restricted-syntax': 0,
    'prefer-destructuring': 0,
    'no-use-before-define': 0,
    'no-lonely-if': 0,
    'radix': 0,
  },
};
