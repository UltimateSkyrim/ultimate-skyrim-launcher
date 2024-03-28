import { LauncherService } from "@/main/services/launcher.service";
import { EnbService } from "@/main/services/enb.service";
import type { StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import { createStubInstance, expect, sinon } from "@loopback/testlab";
import {
  ConfigService,
  PreferenceWithValidator,
} from "@/main/services/config.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { ProfileService } from "@/main/services/profile.service";
import { ErrorService } from "@/main/services/error.service";
import { WindowService } from "@/main/services/window.service";
import { GraphicsService } from "@/main/services/graphics.service";
import { MigrationService } from "@/main/services/migration.service";
import type { ElectronLog } from "electron-log";
import { ModpackService } from "@/main/services/modpack.service";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";

describe("Launcher service #main #service", () => {
  let launcherService: LauncherService;
  let mockEnbService: StubbedInstanceWithSinonAccessor<EnbService>;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockResolutionService: StubbedInstanceWithSinonAccessor<ResolutionService>;
  let mockModpackService: StubbedInstanceWithSinonAccessor<ModpackService>;
  let mockProfileService: StubbedInstanceWithSinonAccessor<ProfileService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockWindowService: StubbedInstanceWithSinonAccessor<WindowService>;
  let mockGraphicsService: StubbedInstanceWithSinonAccessor<GraphicsService>;
  let mockMigrationService: StubbedInstanceWithSinonAccessor<MigrationService>;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;

  beforeEach(() => {
    mockEnbService = createStubInstance(EnbService);
    mockConfigService = createStubInstance(ConfigService);
    mockResolutionService = createStubInstance(ResolutionService);
    mockModpackService = createStubInstance(ModpackService);
    mockProfileService = createStubInstance(ProfileService);
    mockErrorService = createStubInstance(ErrorService);
    mockWindowService = createStubInstance(WindowService);
    mockGraphicsService = createStubInstance(GraphicsService);
    mockMigrationService = createStubInstance(MigrationService);
    mockLogger = getMockLogger();

    launcherService = new LauncherService(
      mockEnbService,
      mockConfigService,
      mockResolutionService,
      mockModpackService,
      mockProfileService,
      mockErrorService,
      mockWindowService,
      mockGraphicsService,
      mockMigrationService,
      mockLogger,
      "1.0.0"
    );
  });

  it("should backup assets", async () => {
    await launcherService.backupAssets();

    sinon.assert.calledOnce(mockEnbService.stubs.backupOriginalEnbs);
    sinon.assert.calledOnce(mockProfileService.stubs.backupOriginalProfiles);
    sinon.assert.calledOnce(mockGraphicsService.stubs.backupOriginalGraphics);
  });

  it("should return the app version", async () => {
    const version = launcherService.getVersion();
    expect(version).to.equal("1.0.0");
  });

  it("should set check prerequisites", async () => {
    launcherService.setCheckPrerequisites(true);

    sinon.assert.calledWith(
      mockConfigService.stubs.setPreference,
      USER_PREFERENCE_KEYS.CHECK_PREREQUISITES,
      true
    );
  });

  it("should get check prerequisites", async () => {
    mockConfigService.stubs.getPreference
      .withArgs(USER_PREFERENCE_KEYS.CHECK_PREREQUISITES)
      .returns(true);

    const checkPrerequisites = launcherService.getCheckPrerequisites();

    expect(checkPrerequisites).to.be.true();
  });

  describe("Validating the config", () => {
    beforeEach(() => {
      mockEnbService.stubs.getDefaultPreference.resolves("test-value");
      mockProfileService.stubs.getDefaultPreference.resolves("test-value");
      mockGraphicsService.stubs.getDefaultPreference.resolves("test-value");
      mockResolutionService.stubs.getCurrentResolution.returns({
        width: 20,
        height: 10,
      });
    });

    it("should get the default preference for each config item", async () => {
      await launcherService.validateConfig();

      sinon.assert.calledOnceWithExactly(
        mockConfigService.stubs.setDefaultPreferences,
        {
          [USER_PREFERENCE_KEYS.ENB_PROFILE]: {
            value: "test-value",
            validate: sinon.match.func as unknown as (
              ...args: unknown[]
            ) => Promise<boolean>,
          },
          [USER_PREFERENCE_KEYS.PRESET]: {
            value: "test-value",
            validate: sinon.match.func as unknown as (
              ...args: unknown[]
            ) => Promise<boolean>,
          },
          [USER_PREFERENCE_KEYS.RESOLUTION]: {
            value: {
              width: 20,
              height: 10,
            },
          },
          [USER_PREFERENCE_KEYS.GRAPHICS]: {
            value: "test-value",
            validate: sinon.match.func as unknown as (
              ...args: unknown[]
            ) => Promise<boolean>,
          },
        }
      );
    });

    it("should call the validate method", async () => {
      mockEnbService.stubs.isValid.resolves(true);
      mockProfileService.stubs.isValid.resolves(true);
      mockGraphicsService.stubs.isValid.resolves(true);

      mockConfigService.stubs.setDefaultPreferences.callsFake(
        async (preferences: PreferenceWithValidator) => {
          for (const value of Object.values(preferences)) {
            if (value.validate) {
              expect(await value.validate()).to.be.true();
            }
          }
        }
      );

      await launcherService.validateConfig();
    });
  });

  describe("Set modpack", () => {
    it("should set the modpack and call relevant services", async () => {
      const filepath = "test/modpack.zip";

      // Mock the method calls to resolve promises immediately
      mockResolutionService.stubs.getResolutionPreference.resolves({
        width: 1920,
        height: 1080,
      });
      mockConfigService.stubs.setPreference.resolves();
      mockMigrationService.stubs.separateProfileFromGraphics.resolves();
      mockEnbService.stubs.resetCurrentEnb.resolves();
      mockGraphicsService.stubs.getGraphicsPreference.resolves("high");
      mockGraphicsService.stubs.setGraphics.resolves();

      await launcherService.setModpack(filepath);

      // Ensure the methods were called with the correct arguments
      // This isn't a great way to test but the responsibility of this method is just to delegate to other services.
      sinon.assert.calledOnceWithExactly(
        mockConfigService.stubs.setPreference,
        USER_PREFERENCE_KEYS.MOD_DIRECTORY,
        filepath
      );
      sinon.assert.calledOnce(
        mockMigrationService.stubs.separateProfileFromGraphics
      );
      sinon.assert.calledOnce(mockEnbService.stubs.resetCurrentEnb);
      sinon.assert.calledOnce(
        mockResolutionService.stubs.getResolutionPreference
      );
      sinon.assert.calledOnce(mockResolutionService.stubs.setResolution);
      sinon.assert.calledOnce(
        mockResolutionService.stubs.setShouldDisableUltraWidescreen
      );
      sinon.assert.calledOnce(mockGraphicsService.stubs.getGraphicsPreference);
      sinon.assert.calledOnce(mockGraphicsService.stubs.setGraphics);
      sinon.assert.notCalled(mockErrorService.stubs.handleError);
      sinon.assert.notCalled(mockErrorService.stubs.handleUnknownError);
      sinon.assert.notCalled(mockWindowService.stubs.quit);
    });

    it("should handle permission error and quit", async () => {
      const filepath = "test/modpack.zip";
      const error = new Error("EPERM");

      mockConfigService.stubs.setPreference.throws(error);

      await launcherService.setModpack(filepath);

      sinon.assert.calledOnceWithMatch(
        mockErrorService.stubs.handleError,
        "Permission error",
        sinon.match.string as unknown as string
      );
      sinon.assert.calledOnce(mockWindowService.stubs.quit);
    });

    it("should handle unknown error", async () => {
      const filepath = "test/modpack.zip";
      const error = new Error("Some unknown error");

      mockConfigService.stubs.setPreference.throws(error);

      await launcherService.setModpack(filepath);

      sinon.assert.calledOnceWithExactly(
        mockErrorService.stubs.handleUnknownError,
        error
      );
    });
  });

  it("should refresh the modpack by setting the modpack to the current modpack", async () => {
    const filepath = "test/modpack.zip";
    mockModpackService.stubs.getModpackDirectory.returns(filepath);

    await launcherService.refreshModpack();

    // Ensure the methods were called with the correct arguments
    // This isn't a great way to test but the responsibility of this method is just to delegate to other services.
    sinon.assert.calledOnceWithExactly(
      mockConfigService.stubs.setPreference,
      USER_PREFERENCE_KEYS.MOD_DIRECTORY,
      filepath
    );
    sinon.assert.calledOnce(
      mockMigrationService.stubs.separateProfileFromGraphics
    );
    sinon.assert.calledOnce(mockEnbService.stubs.resetCurrentEnb);
    sinon.assert.calledOnce(
      mockResolutionService.stubs.getResolutionPreference
    );
    sinon.assert.calledOnce(mockResolutionService.stubs.setResolution);
    sinon.assert.calledOnce(
      mockResolutionService.stubs.setShouldDisableUltraWidescreen
    );
    sinon.assert.calledOnce(mockGraphicsService.stubs.getGraphicsPreference);
    sinon.assert.calledOnce(mockGraphicsService.stubs.setGraphics);
    sinon.assert.notCalled(mockErrorService.stubs.handleError);
    sinon.assert.notCalled(mockErrorService.stubs.handleUnknownError);
    sinon.assert.notCalled(mockWindowService.stubs.quit);
  });
});
