import mockFs from "mock-fs";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { GameService } from "@/main/services/game.service";
import { ConfigService } from "@/main/services/config.service";
import fs from "fs";
import { mockLogger } from "@/__tests__/unit/main/support/mocks/logger.mock";

describe("GameService", () => {
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let gameService: GameService;

  let logPath: string;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    gameService = new GameService(mockConfigService, mockLogger());

    logPath = "mock/log/path";
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  it("should copy Skyrim logs if they exist", async () => {
    mockConfigService.stubs.skyrimDirectory.returns("mock/path");
    mockConfigService.stubs.getLogDirectory.returns(logPath);

    mockFs({
      "mock/path/d3dx9_42.log": "mock log file",
      [logPath]: {},
    });

    await gameService.copySkyrimLaunchLogs();

    expect(fs.existsSync(`${logPath}/skyrim-launch-logs.log`)).to.true();
  });

  it("should not copy Skyrim logs if they don't exist", async () => {
    mockConfigService.stubs.skyrimDirectory.returns("mock/path");
    mockConfigService.stubs.getLogDirectory.returns(logPath);

    mockFs({
      [logPath]: {},
    });

    await gameService.copySkyrimLaunchLogs();

    expect(fs.existsSync(`${logPath}/skyrim-launch-logs.log`)).to.false();
  });
});
