import mock from "mock-require";
// electron-is-dev throws an error if not running in electron
mock("electron-is-dev", () => {
  return true;
});
import { StartupService } from "@/main/services/startup.service";
import {
  createStubInstance,
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
import { getMockLogger } from "@/__tests__/unit/helpers/logger.mock";

describe("Startup service", () => {
  let mockModpackService: StubbedInstanceWithSinonAccessor<ModpackService>;
  let mockLauncherService: StubbedInstanceWithSinonAccessor<LauncherService>;
  let mockWabbajackService: StubbedInstanceWithSinonAccessor<WabbajackService>;
  let mockResolutionService: StubbedInstanceWithSinonAccessor<ResolutionService>;
  let mockUpdateService: StubbedInstanceWithSinonAccessor<UpdateService>;
  let mockBlacklistService: StubbedInstanceWithSinonAccessor<BlacklistService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockWindowService: StubbedInstanceWithSinonAccessor<WindowService>;

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

    startupService = new StartupService(
      mockModpackService,
      mockLauncherService,
      mockWabbajackService,
      mockResolutionService,
      mockUpdateService,
      mockBlacklistService,
      mockErrorService,
      mockWindowService,
      getMockLogger()
    );
  });

  after(() => {
    mock.stopAll();
    sinon.restore();
  });

  it("should quit if a blacklisted process is running", async () => {
    mockBlacklistService.stubs.blacklistedProcessesRunning.resolves([
      { name: "mock name", processName: "mockProcess.exe", running: true },
    ]);

    startupService.registerStartupCommands("processBlacklist");
    await startupService.runStartup();

    sinon.assert.called(mockWindowService.stubs.quit);
  });

  it("should not quit if there are no blacklisted processes", async () => {
    startupService.registerStartupCommands(
      'Check if blacklisted process is running"'
    );
    await startupService.runStartup();

    sinon.assert.notCalled(mockWindowService.stubs.quit);
  });
});
