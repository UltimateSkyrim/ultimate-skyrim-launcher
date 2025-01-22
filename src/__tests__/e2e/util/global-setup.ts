import fs from "fs/promises";
import { config } from "./config";
import { exec } from "child_process";
import util from "util";

const execAsync = util.promisify(exec);

/**
 * To gather coverage for the electron main process, the files must be instrumented.
 * This does not do any compiling, it only adds coverage instrumenting to the files.
 * Instrumenting adds coverage tracking to the files, which is then used to generate coverage reports.
 */
async function instrumentFiles() {
  // Ensure the instrumented directory is removed before instrumentation
  await fs.rm(config().paths.instrumented, {
    recursive: true,
    force: true,
  });

  const command = `npx lb-nyc instrument ./dist ${
    config().paths.instrumented
  } --complete-copy --delete --nycrc-path src/__tests__/e2e/.nycrc`;

  try {
    const { stderr } = await execAsync(command);
    if (stderr) {
      console.error("Instrumentation warnings/errors:", stderr);
    }
  } catch (error) {
    console.error("Error during instrumentation:", error);
    throw error;
  }
}

async function globalSetup() {
  for (const dir of ["coverage", "mock-files"]) {
    await fs.rm(`${config().paths.playwright}/${dir}`, {
      recursive: true,
      force: true,
    });
  }

  await instrumentFiles();
}

export default globalSetup;
