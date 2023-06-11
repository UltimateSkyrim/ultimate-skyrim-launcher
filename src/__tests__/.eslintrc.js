module.exports = {
  extends: "@loopback/eslint-config",
  env: {
    node: true,
    mocha: true,
  },
  parserOptions: {
    parser: "@typescript-eslint/parser",
    project: "../../tsconfig.eslint.json",
    tsconfigRootDir: __dirname,
  },
};
