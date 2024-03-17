import { sinon } from "@loopback/testlab/dist/sinon";
import logger from "electron-log";
import { generateUniqueId } from "@loopback/core";

export const getMockLogger = () =>
  sinon.stub(logger.create(generateUniqueId()));
