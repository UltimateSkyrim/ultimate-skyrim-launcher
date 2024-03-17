/* istanbul ignore file */

import type { Dirent } from "fs-extra";

// TODO could all these methods be a sinon.stub instead and remove the ignore line?
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
