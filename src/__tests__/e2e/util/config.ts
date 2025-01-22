import path from "path";

const root = path.resolve(`${__dirname}/../../../..`);
const playwrightDir = `${root}/.playwright`;

export const config = () => ({
  paths: {
    root,
    playwright: playwrightDir,
    screenshots: `${playwrightDir}/screenshots/`,
    mockFiles: `${playwrightDir}/mock-files`,
  },
});
