import fs from "fs";
import { ConfigService } from "@/main/services/config.service";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { not as isNotJunk } from "junk";
import { inject, service } from "@loopback/core";
import { ProfileService } from "@/main/services/profile.service";
import path from "path";
import { copy, existsSync } from "fs-extra";
import { Logger, LoggerBinding } from "@/main/logger";
import type { FriendlyDirectoryMap } from "@/types/modpack-metadata";

export class GraphicsService {
  constructor(
    @service(ConfigService) private configService: ConfigService,
    @service(ProfileService) private profileService: ProfileService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  graphicsDirectory() {
    return `${this.configService.launcherDirectory()}/Graphics Presets`;
  }

  graphicsMappingFile() {
    return "namesGraphics.json";
  }

  graphicsMappingPath() {
    return `${this.configService.launcherDirectory()}/${this.graphicsMappingFile()}`;
  }

  async isInGraphicsList(graphics: string) {
    return (
      (await this.getGraphics()).filter(({ real }) => real === graphics)
        .length > 0
    );
  }

  async isValid(graphics: string) {
    return this.isInGraphicsList(graphics);
  }

  async getDefaultPreference() {
    return (
      (await this.getGraphics())[0]?.real ??
      (() => {
        throw new Error("No graphics found");
      })()
    );
  }

  async syncGraphicsFromGameToPresets(graphicsPreset: string, profile: string) {
    this.logger.info(
      `Syncing graphics changes back to presets for ${graphicsPreset}`
    );

    const graphicsFiles = await this.getGraphicsFilesForPreset(graphicsPreset);
    this.logger.debug(
      `Graphics files that need to be synced: ${JSON.stringify(graphicsFiles)}`
    );

    for (const file of graphicsFiles) {
      const fileWithPath = `${this.profileService.profileDirectory()}/${profile}/${file}`;
      const fileDestination = `${this.graphicsDirectory()}/${graphicsPreset}/${file}`;
      if (existsSync(fileWithPath)) {
        this.logger.debug(`Copying ${fileWithPath} to ${fileDestination}`);
        await copy(fileWithPath, fileDestination, { overwrite: true });
      }
    }

    this.logger.info("Finished syncing graphics presets");
  }

  async getGraphics(): Promise<FriendlyDirectoryMap[]> {
    const mappedGraphics = await this.getMappedGraphics();
    const unmappedGraphics = await this.getUnmappedGraphics(mappedGraphics);

    return [...mappedGraphics, ...unmappedGraphics];
  }

  /**
   * Return the current graphics preference or the first if it is invalid
   */
  getGraphicsPreference(): string {
    return this.configService.getPreference<string>(
      USER_PREFERENCE_KEYS.GRAPHICS
    );
  }

  async setGraphics(graphics: string) {
    this.logger.info(`Setting graphics to ${graphics}`);
    this.setGraphicsPreference(graphics);
    await this.updateProfilesWithGraphics(graphics);
  }

  async getGraphicsFilesForPreset(graphics: string) {
    return fs.promises.readdir(`${this.graphicsDirectory()}/${graphics}`);
  }

  async updateProfilesWithGraphics(preset: string) {
    this.logger.debug("Updating profiles with graphics settings");
    const graphics = (await this.getGraphicsFilesForPreset(preset)).map(
      (file) => `${this.graphicsDirectory()}/${preset}/${file}`
    );
    const profiles = await this.profileService.getProfileDirectories();
    return Promise.all(
      profiles.map((profile) =>
        graphics.map(async (file) => {
          this.logger.debug(`Copying ${file} to ${profile}`);
          await fs.promises.copyFile(file, `${profile}/${path.basename(file)}`);
        })
      )
    );
  }

  setGraphicsPreference(graphics: string) {
    this.configService.setPreference(USER_PREFERENCE_KEYS.GRAPHICS, graphics);
  }

  async backupOriginalGraphics() {
    const backupExists = existsSync(this.graphicsBackupDirectory());
    this.logger.debug(`Backup for graphics exists: ${backupExists}`);

    if (!backupExists) {
      this.logger.info("No graphics backup exists. Backing up...");
      await fs.promises.mkdir(this.configService.backupDirectory(), {
        recursive: true,
      });

      await copy(this.graphicsDirectory(), this.graphicsBackupDirectory());
    }
  }

  async graphicsExist() {
    return fs.existsSync(this.graphicsDirectory());
  }

  extractGraphicsFiles(files: string[]) {
    const graphicsFiles = ["Skyrim.ini", "SkyrimCustom.ini", "SkyrimPrefs.ini"];
    return files.filter((file) => graphicsFiles.includes(path.basename(file)));
  }

  async restoreGraphics() {
    this.logger.info("Restoring graphics settings");
    this.logger.debug(
      `Copying ${this.graphicsBackupDirectory()} to ${this.graphicsDirectory()}`
    );
    await copy(this.graphicsBackupDirectory(), this.graphicsDirectory(), {
      overwrite: true,
    });
    await this.updateProfilesWithGraphics(this.getGraphicsPreference());
    this.logger.info("Graphics restored");
  }

  private graphicsBackupDirectory() {
    return `${this.configService.backupDirectory()}/graphics`;
  }

  private async getMappedGraphics(): Promise<FriendlyDirectoryMap[]> {
    return JSON.parse(
      await fs.promises.readFile(`${this.graphicsMappingPath()}`, "utf-8")
    );
  }

  private async getUnmappedGraphics(mappedGraphics: FriendlyDirectoryMap[]) {
    return (
      (
        await fs.promises.readdir(this.graphicsDirectory(), {
          withFileTypes: true,
        })
      )
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter(isNotJunk)
        .map(
          (preset): FriendlyDirectoryMap => ({ real: preset, friendly: preset })
        )
        // Remove any graphics that have a mapping
        .filter(
          (unmappedSetting) =>
            !mappedGraphics.find(
              (mappedSetting: FriendlyDirectoryMap) =>
                mappedSetting.real === unmappedSetting.real
            )
        )
    );
  }
}
