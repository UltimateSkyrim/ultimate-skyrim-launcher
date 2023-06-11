import path from "path";
import childProcess from "child_process";
import { ConfigService } from "@/main/services/config.service";
import psList from "ps-list";
import { dialog } from "electron";
import fs from "fs";
import { IIniObject, IIniObjectSection, parse, stringify } from "js-ini";
import { promisify } from "util";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { EnbService } from "@/main/services/enb.service";
import { service } from "@loopback/core";
import { ErrorService } from "@/main/services/error.service";
import { BindingScope, inject, injectable } from "@loopback/context";
import { ResolutionService } from "@/main/services/resolution.service";
import { GameService } from "@/main/services/game.service";
import { ProfileService } from "@/main/services/profile.service";
import { SystemService } from "@/main/services/system.service";
import { GraphicsService } from "@/main/services/graphics.service";
import type { ModOrganizerIni } from "@/shared/types/ModOrganizer.ini";
import { Logger, LoggerBinding } from "@/main/logger";

export const enum MO2_NAMES {
  MO2EXE = "ModOrganizer.exe",
  MO2Settings = "ModOrganizer.ini",
}

@injectable({
  scope: BindingScope.SINGLETON,
})
export class ModOrganizerService {
  private previousMO2Settings: IIniObject | null = null;

  constructor(
    @service(EnbService) private enbService: EnbService,
    @service(ErrorService) private errorService: ErrorService,
    @service(ConfigService) private configService: ConfigService,
    @service(ResolutionService) private resolutionService: ResolutionService,
    @service(GameService) private gameService: GameService,
    @service(ProfileService) private profileService: ProfileService,
    @service(SystemService) private systemService: SystemService,
    @service(GraphicsService) private graphicsService: GraphicsService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  private static filterMO2(process: psList.ProcessDescriptor) {
    return process.name === MO2_NAMES.MO2EXE;
  }

  async isRunning() {
    return this.systemService.isProcessRunning(MO2_NAMES.MO2EXE);
  }

  async closeMO2() {
    this.logger.info("Killing MO2 forcefully");
    (await psList())
      .filter(ModOrganizerService.filterMO2)
      .forEach((mo2Instance) => {
        this.logger.debug(
          `Found process to kill: ${JSON.stringify(mo2Instance)}`
        );
        process.kill(mo2Instance.pid);
      });
    this.logger.info("Killed all MO2 processes");
  }

  async handleMO2Running(): Promise<boolean> {
    this.logger.info(
      "MO2 already running. Giving user option to cancel or continue"
    );
    const buttonSelectionIndex = await dialog.showMessageBox({
      title: "Mod Organizer running",
      message:
        "Mod Organizer 2 is already running. This could launch the wrong mod list. Would you like to close it first?",
      buttons: ["Cancel", "Close MO2 and continue"],
    });
    if (buttonSelectionIndex.response === 1) {
      await this.closeMO2();
      return true;
    } else {
      return false;
    }
  }

  async readSettings() {
    return parse(
      await fs.promises.readFile(
        `${this.configService.modDirectory()}/${MO2_NAMES.MO2Settings}`,
        "utf-8"
      )
    ) as ModOrganizerIni;
  }

  async getFirstCustomExecutableTitle() {
    const settings = await this.readSettings();
    return settings["customExecutables"]["1\\title"];
  }

  async updateSelectedProfile(profile: string) {
    this.logger.info(`Updating selected profile to ${profile}`);
    const settings = await this.readSettings();

    (settings.General as IIniObjectSection)[
      "selected_profile"
    ] = `@ByteArray(${profile})`;

    await fs.promises.writeFile(
      `${this.configService.modDirectory()}/${MO2_NAMES.MO2Settings}`,
      stringify(settings)
    );
  }

  async preventMO2GUIFromShowing() {
    this.logger.info(`Preventing the MO2 GUI from showing`);
    const settings = await this.readSettings();
    // Copy the object so changes don't mutate it
    this.previousMO2Settings = JSON.parse(
      JSON.stringify(settings)
    ) as IIniObject;

    (settings.Settings as IIniObjectSection)["lock_gui"] = false;

    await fs.promises.writeFile(
      `${this.configService.modDirectory()}/${MO2_NAMES.MO2Settings}`,
      stringify(settings)
    );
  }

  async restoreMO2Settings() {
    this.logger.info("Restoring MO2 settings");
    // If we have some previous settings saved, restore them
    if (this.previousMO2Settings) {
      await fs.promises.writeFile(
        `${this.configService.modDirectory()}/${MO2_NAMES.MO2Settings}`,
        stringify(this.previousMO2Settings)
      );
      this.previousMO2Settings = null;
    }
    this.logger.info("Finished restoring MO2 settings");
  }

  /**
   * Prepare MO2/Skyrim for launch.
   * Return true if the operation should continue and false if it should be aborted
   */
  async prepareForLaunch(): Promise<boolean> {
    if (await this.isRunning()) {
      const continueLaunching = await this.handleMO2Running();
      if (!continueLaunching) {
        this.logger.info("MO2 already running, user chose to abort");
        return false;
      }
    }

    await this.resolutionService.setResolutionInGraphicsSettings();

    this.logger.debug(
      `User configuration: ${JSON.stringify(
        this.configService.getPreferences().store
      )}`
    );

    return true;
  }

  async launchMO2() {
    this.logger.info("Preparing MO2 for launch");

    try {
      const continueLaunch = await this.prepareForLaunch();
      if (!continueLaunch) {
        return;
      }

      this.logger.info("Launching MO2");

      // MO2 will not respect the profile set in the launcher until the config is edited
      await this.updateSelectedProfile(
        await this.profileService.getProfilePreference()
      );

      const MO2Path = path.join(
        this.configService.getPreference(USER_PREFERENCE_KEYS.MOD_DIRECTORY),
        MO2_NAMES.MO2EXE
      );
      const { stderr } = await promisify(childProcess.exec)(`"${MO2Path}"`);
      if (stderr) {
        this.logger.error(`Error while executing ModOrganizer - ${stderr}`);
      }
    } catch (error) {
      this.logger.error(`Error while opening MO2 - ${error}`);
      throw error;
    }
  }

  async launchGame() {
    this.logger.info("Preparing to launch game");

    try {
      const continueLaunch = await this.prepareForLaunch();
      if (!continueLaunch) {
        return;
      }

      await this.preventMO2GUIFromShowing();

      this.logger.info("Launching game");

      const MO2Path = path.join(
        this.configService.getPreference(USER_PREFERENCE_KEYS.MOD_DIRECTORY),
        MO2_NAMES.MO2EXE
      );
      const profile = this.configService.getPreference(
        USER_PREFERENCE_KEYS.PRESET
      );

      const mo2Command = `"${MO2Path}" -p "${profile}" "moshortcut://:${await this.getFirstCustomExecutableTitle()}"`;
      this.logger.debug(`Executing MO2 command: ${mo2Command}`);

      const { stderr } = await promisify(childProcess.exec)(mo2Command);
      await this.postLaunch();
      if (stderr) {
        this.errorService.handleError(
          "Error launching game",
          `${stderr}`
        );
      }
    } catch (error) {
      await this.postLaunch();
      this.errorService.handleError("Error launching game", `${error}`);
    }
  }

  async postLaunch() {
    this.logger.info("MO2 exited, starting post launch actions");
    await this.gameService.copySkyrimLaunchLogs();
    await this.restoreMO2Settings();
    await this.enbService.syncENBFromGameToPresets(
      this.configService.getPreference(USER_PREFERENCE_KEYS.ENB_PROFILE)
    );
    await this.graphicsService.syncGraphicsFromGameToPresets(
      this.configService.getPreference(USER_PREFERENCE_KEYS.GRAPHICS),
      this.configService.getPreference(USER_PREFERENCE_KEYS.PRESET)
    );
  }
}
