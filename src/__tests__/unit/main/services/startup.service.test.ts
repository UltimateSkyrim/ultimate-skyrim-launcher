import { COMMAND_IDS, StartupService } from "@/main/services/startup.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { ModpackService } from "@/main/services/modpack.service";
import { LauncherService } from "@/main/services/launcher.service";
import { WabbajackService } from "@/main/services/wabbajack.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { UpdateService } from "@/main/services/update.service";
import { BlacklistService } from "@/main/services/blacklist.service";
import { ErrorService } from "@/main/services/error.service";
import { WindowService } from "@/main/services/window.service";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import type { ElectronLog } from "electron-log";
import type electron from "electron";
import os from "os";

describe("Startup service", () => {
  let mockModpackService: StubbedInstanceWithSinonAccessor<ModpackService>;
  let mockLauncherService: StubbedInstanceWithSinonAccessor<LauncherService>;
  let mockWabbajackService: StubbedInstanceWithSinonAccessor<WabbajackService>;
  let mockResolutionService: StubbedInstanceWithSinonAccessor<ResolutionService>;
  let mockUpdateService: StubbedInstanceWithSinonAccessor<UpdateService>;
  let mockBlacklistService: StubbedInstanceWithSinonAccessor<BlacklistService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockWindowService: StubbedInstanceWithSinonAccessor<WindowService>;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;

  let startupService: StartupService;

  beforeEach(() => {
    mockModpackService = createStubInstance(ModpackService);
    mockLauncherService = createStubInstance(LauncherService);
    mockWabbajackService = createStubInstance(WabbajackService);
    mockResolutionService = createStubInstance(ResolutionService);
    mockUpdateService = createStubInstance(UpdateService);
    mockBlacklistService = createStubInstance(BlacklistService);
    mockErrorService = createStubInstance(ErrorService);
    mockWindowService = createStubInstance(WindowService);
    mockLogger = getMockLogger();

    startupService = new StartupService(
      mockModpackService,
      mockLauncherService,
      mockWabbajackService,
      mockResolutionService,
      mockUpdateService,
      mockBlacklistService,
      mockErrorService,
      mockWindowService,
      {
        app: {
          getVersion: () => "mock version",
        },
      } as unknown as typeof electron,
      mockLogger
    );
  });

  after(() => {
    sinon.restore();
  });

  it("should run the startup logs", async () => {
    sinon.stub(os, "platform").returns("linux");
    sinon.stub(os, "type").returns("mock type");
    sinon.stub(os, "version").returns("mock version");

    mockWabbajackService.stubs.getModpackVersion.resolves("mock version");
    mockModpackService.stubs.getModpackDirectory.returns("mock path");
    mockResolutionService.stubs.getCurrentResolution.returns({
      width: 1920,
      height: 1080,
    });

    startupService.registerStartupCommands(COMMAND_IDS.STARTUP_LOGS);
    await startupService.runStartup();

    sinon.assert.calledWithMatch(
      mockLogger.debug,
      [
        "--- Startup debug logs ---",
        "OS: mock type linux mock version",
        "Modpack version: mock version",
        "Launcher version: mock version",
        "Modpack path: mock path",
        'Current screen resolution: {"width":1920,"height":1080}',
        "--- End startup debug logs ---",
      ].join(os.EOL)
    );
  });

  it("should quit if a blacklisted process is running", async () => {
    mockBlacklistService.stubs.blacklistedProcessesRunning.resolves([
      { name: "mock name", processName: "mockProcess.exe", running: true },
    ]);

    startupService.registerStartupCommands(COMMAND_IDS.PROCESS_BLACKLIST);
    await startupService.runStartup();

    sinon.assert.called(mockWindowService.stubs.quit);
  });

  it("should update the app", async () => {
    startupService.registerStartupCommands(COMMAND_IDS.UPDATE);
    await startupService.runStartup();

    sinon.assert.called(mockUpdateService.stubs.update);
  });

  it("should not quit if there are no blacklisted processes", async () => {
    startupService.registerStartupCommands(COMMAND_IDS.PROCESS_BLACKLIST);
    mockBlacklistService.stubs.blacklistedProcessesRunning.resolves([]);

    await startupService.runStartup();

    sinon.assert.notCalled(mockWindowService.stubs.quit);
  });

  it("should delete the modpack preference if it is invalid", async () => {
    mockModpackService.stubs.checkCurrentModpackPathIsValid.returns(false);
    mockModpackService.stubs.isModpackSet.returns(true);
    startupService.registerStartupCommands(COMMAND_IDS.CHECK_MODPACK_PATH);

    await startupService.runStartup();

    sinon.assert.called(mockModpackService.stubs.deleteModpackDirectory);
  });

  it("should not delete the modpack preference if it is valid", async () => {
    mockModpackService.stubs.checkCurrentModpackPathIsValid.returns(true);
    mockModpackService.stubs.isModpackSet.returns(true);
    startupService.registerStartupCommands(COMMAND_IDS.CHECK_MODPACK_PATH);

    await startupService.runStartup();

    sinon.assert.notCalled(mockModpackService.stubs.deleteModpackDirectory);
  });

  it("should refresh the modpack", async () => {
    mockModpackService.stubs.isModpackSet.returns(true);
    startupService.registerStartupCommands(COMMAND_IDS.REFRESH_MODPACK);

    await startupService.runStartup();

    sinon.assert.called(mockLauncherService.stubs.refreshModpack);
  });

  it("should run all startup commands if there is no filter", async () => {
    startupService.registerStartupCommands();

    expect(
      startupService
        .getStartupCommands()
        .map((command) => command.id)
        .sort()
    ).to.deepEqual(
      [
        COMMAND_IDS.CHECK_MODPACK_PATH,
        COMMAND_IDS.PROCESS_BLACKLIST,
        COMMAND_IDS.REFRESH_MODPACK,
        COMMAND_IDS.STARTUP_LOGS,
        COMMAND_IDS.UPDATE,
      ].sort()
    );
  });

  it("should not execute anything if the command requires a modpack but it isn't set", async () => {
    mockModpackService.stubs.isModpackSet.returns(false);
    startupService.registerStartupCommands(COMMAND_IDS.REFRESH_MODPACK);

    await startupService.runStartup();

    sinon.assert.notCalled(mockLauncherService.stubs.refreshModpack);
  });
});
