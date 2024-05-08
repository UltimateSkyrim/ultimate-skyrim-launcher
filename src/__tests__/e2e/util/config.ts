import path from "path";

const root = path.resolve(`${__dirname}/../../../..`);

export const config = () => ({
  paths: {
    root,
    mockFiles: `${root}/.playwright/mock-files`,
  },
});
