import { sinon } from "@loopback/testlab/dist/sinon";
import logger from "electron-log";
import { uuid } from "@loopback/core";

export const mockLogger = () => sinon.stub(logger.create(uuid()));
