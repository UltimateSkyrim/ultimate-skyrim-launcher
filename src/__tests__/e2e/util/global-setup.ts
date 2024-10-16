import fs from "fs/promises";
import { config } from "./config";

async function globalSetup() {
  await fs.rm(`${config().paths.playwright}/coverage`, {
    recursive: true,
    force: true,
  });
}

export default globalSetup;
