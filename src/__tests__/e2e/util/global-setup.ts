import fs from "fs/promises";
import { config } from "./config";

async function globalSetup() {
  for (const dir of ["coverage", "mock-files"]) {
    await fs.rm(`${config().paths.playwright}/${dir}`, {
      recursive: true,
      force: true,
    });
  }
}

export default globalSetup;
