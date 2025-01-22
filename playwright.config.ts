import { defineConfig } from "@playwright/test";

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: /.*\.e2e\..*/,

  globalSetup: "./src/__tests__/e2e/util/global-setup.ts",

  globalTeardown: "./src/__tests__/e2e/util/global-teardown.ts",

  // TODO can parallel be enabled with later electron versions?
  /* Run tests in files in parallel */
  fullyParallel: false,
  workers: 1,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env["CI"],
  /* Retry on CI only */
  retries: process.env["CI"] ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  ...(process.env["CI"] && { workers: 1 }),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    [
      "html",
      {
        outputFolder: ".playwright/report",
        open: "never",
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    screenshot: "only-on-failure",
  },

  outputDir: ".playwright/test-results",

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run start:renderer",
    url: "http://127.0.0.1:8080/health",
    reuseExistingServer: !process.env["CI"],
    stdout: "ignore",
    stderr: "ignore",
  },
});
