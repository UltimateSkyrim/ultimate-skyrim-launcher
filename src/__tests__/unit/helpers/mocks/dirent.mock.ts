import type { Dirent } from "fs-extra";
import sinon from "sinon";

export const mockDirent: Omit<Dirent, "name"> = {
  isFile: sinon.stub().returns(true),
  isBlockDevice: sinon.stub().returns(false),
  isCharacterDevice: sinon.stub().returns(false),
  isDirectory: sinon.stub().returns(false),
  isFIFO: sinon.stub().returns(false),
  isSocket: sinon.stub().returns(false),
  isSymbolicLink: sinon.stub().returns(false),
};
