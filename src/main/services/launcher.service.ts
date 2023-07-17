import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { service } from "@loopback/core";
import { ProfileService } from "@/main/services/profile.service";
import { EnbService } from "@/main/services/enb.service";
import { ConfigService } from "@/main/services/config.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { ModpackService } from "@/main/services/modpack.service";
import { BindingScope, inject, injectable } from "@loopback/context";
import { app } from "electron";
import { ErrorService } from "@/main/services/error.service";
import { WindowService } from "@/main/services/window.service";
import { GraphicsService } from "@/main/services/graphics.service";
import { MigrationService } from "@/main/services/migration.service";
import { Logger, LoggerBinding } from "@/main/logger";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class LauncherService {
  constructor(
    @service(EnbService) private enbService: EnbService,
    @service(ConfigService) private configService: ConfigService,
    @service(ResolutionService) private resolutionService: ResolutionService,
    @service(ModpackService) private modpackService: ModpackService,
    @service(ProfileService) private profileService: ProfileService,
    @service(ErrorService) private errorService: ErrorService,
    @service(WindowService) private windowService: WindowService,
    @service(GraphicsService) private graphicsService: GraphicsService,
    @service(MigrationService) private migrationService: MigrationService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  async refreshModpack() {
    this.logger.debug("Refreshing modpack");
    return this.setModpack(this.modpackService.getModpackDirectory());
  }

  async setModpack(filepath: string) {
    try {
      this.configService.setPreference(
        USER_PREFERENCE_KEYS.MOD_DIRECTORY,
        filepath
      );
      await this.migrationService.separateProfileFromGraphics();
      await this.validateConfig();
      await this.backupAssets();
      await this.enbService.resetCurrentEnb(false);
      await this.resolutionService.setResolution(
        this.resolutionService.getResolutionPreference()
      );
      await this.resolutionService.setShouldDisableUltraWidescreen();
      await this.graphicsService.setGraphics(
        this.graphicsService.getGraphicsPreference()
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("EPERM")) {
        this.errorService.handleError(
          "Permission error",
          `
          The launcher has been unable to create/modify some files due to a permissions error.
          It is strongly recommended you restart the application as an administrator.
          If this does not work, you will need to change the permissions of the install directory.`
        );
        this.windowService.quit();
      } else {
        this.errorService.handleUnknownError(error);
      }
    }
  }

  async validateConfig() {
    this.logger.debug("Validating config...");
    await this.configService.setDefaultPreferences({
      [USER_PREFERENCE_KEYS.ENB_PROFILE]: {
        value: await this.enbService.getDefaultPreference(),
        validate: async () =>
          this.enbService.isValid(await this.enbService.getEnbPreference()),
      },
      [USER_PREFERENCE_KEYS.PRESET]: {
        value: await this.profileService.getDefaultPreference(),
        validate: async () =>
          this.profileService.isValid(
            await this.profileService.getProfilePreference()
          ),
      },
      [USER_PREFERENCE_KEYS.RESOLUTION]: {
        value: this.resolutionService.getCurrentResolution(),
      },
      [USER_PREFERENCE_KEYS.GRAPHICS]: {
        value: await this.graphicsService.getDefaultPreference(),
        validate: async () =>
          this.graphicsService.isValid(
            this.graphicsService.getGraphicsPreference()
          ),
      },
    });
    this.logger.debug("Config validated");
  }

  async backupAssets() {
    await this.enbService.backupOriginalEnbs();
    await this.profileService.backupOriginalProfiles();
    await this.graphicsService.backupOriginalGraphics();
  }

  getVersion() {
    return app.getVersion();
  }

  setCheckPrerequisites(value: boolean) {
    return this.configService.setPreference(
      USER_PREFERENCE_KEYS.CHECK_PREREQUISITES,
      value
    );
  }

  getCheckPrerequisites() {
    return this.configService.getPreference(
      USER_PREFERENCE_KEYS.CHECK_PREREQUISITES
    );
  }
}
