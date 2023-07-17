import fs from "fs/promises";
import path from "path";

interface Directory {
  [fileName: string]: Directory | string;
}

const readDirectory = async (dir: string): Promise<Directory> => {
  const directoryObject: Directory = {};

  const files = await fs.readdir(dir);

  await Promise.all(
    files.map(async (file) => {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        directoryObject[file] = await fs.readFile(filePath, "utf8");
      } else if (stats.isDirectory()) {
        directoryObject[file] = await readDirectory(filePath);
      }
    })
  );

  return directoryObject;
};

export const readFilesFromDirectory = async (
  directoryPath: string
): Promise<Directory> => {
  try {
    return await readDirectory(directoryPath);
  } catch (error) {
    // istanbul ignore next
    throw new Error(`Error reading directory: ${(error as Error).message}`);
  }
};
