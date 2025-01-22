import path from "path";

const root = path.resolve(`${__dirname}/../../../..`);
const playwrightDir = `${root}/.playwright`;

export const config = () => ({
  paths: {
    root,
    playwright: playwrightDir,
    coverage: `${playwrightDir}/coverage`,
    screenshots: `${playwrightDir}/screenshots/`,
    mockFiles: `${playwrightDir}/mock-files`,
    instrumented: `${playwrightDir}/dist-instrumented`,
  },
});
