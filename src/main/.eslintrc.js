module.exports = {
  extends: "@loopback/eslint-config",
  root: false,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    parser: "@typescript-eslint/parser",
    project: "../../tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
  rules: {
    "@typescript-eslint/naming-convention": [
      "error",
      {
        selector: "enum",
        format: ["UPPER_CASE"],
      },
    ],
  },
};
