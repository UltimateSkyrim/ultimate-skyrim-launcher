import type { Dirent } from "fs-extra";

export const mockDirent: Omit<Dirent, "name"> = {
  isFile() {
    return true;
  },
  isBlockDevice() {
    return false;
  },
  isCharacterDevice() {
    return false;
  },
  isDirectory() {
    return false;
  },
  isFIFO() {
    return false;
  },
  isSocket() {
    return false;
  },
  isSymbolicLink(): boolean {
    return false;
  },
};
