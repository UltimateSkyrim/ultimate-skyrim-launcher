module.exports = function (w) {
  return {
    files: [
      "src/**/*.ts",
      "src/**/*.js",
      "src/**/*.json",
      "!src/__tests__/**/unit/**/*.test.ts",
      "tsconfig.json",
    ],
    tests: ["src/__tests__/**/unit/**/*.test.ts"],

    testFramework: "mocha",

    compilers: {
      "**/*.ts": w.compilers.typeScript({
        noResolve: false,
      }),
    },

    env: {
      type: "node",
    },

    setup: function () {
      // Ensure MockFs has fully reset before starting
      require("mock-fs").restore();

      // Enable TypeScript aliases
      if (global._tsconfigPathsRegistered) return;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tsConfigPaths = require("tsconfig-paths");
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tsconfig = require("./tsconfig.json");
      tsConfigPaths.register({
        baseUrl: tsconfig.compilerOptions.baseUrl,
        paths: {
          "@/*": ["./src/*", "./src/types/*"],
        },
      });
      global._tsconfigPathsRegistered = true;
    },
  };
};
