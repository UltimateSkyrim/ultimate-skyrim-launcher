module.exports = {
  "env": {
    "node": false,
    "browser": false,
    "es6": true
  },
  "extends": [
    "eslint:recommended",
    "@vue/typescript/recommended",
    "plugin:vue/vue3-recommended",
    "prettier"
  ],
  "parser": "vue-eslint-parser",
  "parserOptions": {
    "parser": "@typescript-eslint/parser",
  },
}
