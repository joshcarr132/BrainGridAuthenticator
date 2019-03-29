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
  },

};
