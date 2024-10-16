import path from "path";

const root = path.resolve(`${__dirname}/../../../..`);

export const config = () => ({
  paths: {
    root,
    playwright: `${root}/.playwright`,
    mockFiles: `${root}/.playwright/mock-files`,
  },
});
