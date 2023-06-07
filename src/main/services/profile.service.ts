import { ConfigService } from "@/main/services/config.service";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import type { FriendlyDirectoryMap } from "@/modpack-metadata";
import fs from "fs";
import { not as isNotJunk } from "junk";
import { copy, existsSync } from "fs-extra";
import { inject, service } from "@loopback/core";
import { Logger, LoggerBinding } from "@/main/logger";

export class ProfileService {
  constructor(
    @service(ConfigService) private configService: ConfigService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  profileDirectory() {
    return `${this.configService.modDirectory()}/profiles`;
  }

  profileBackupDirectory() {
    return `${this.configService.backupDirectory()}/profiles`;
  }

  profileMappingFile() {
    return `${this.configService.launcherDirectory()}/namesMO2.json`;
  }

  getShowHiddenProfiles() {
    return (
      this.configService.getPreference(
        USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE
      ) ?? false
    );
  }

  setShowHiddenProfiles(show: boolean) {
    return this.configService.setPreference(
      USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE,
      show
    );
  }

  async getProfiles(): Promise<FriendlyDirectoryMap[]> {
    // Get mapped profile names that have a mapping
    const mappedProfiles = await this.getMappedProfiles();

    // Get any profiles that don't have a mapping
    const unmappedProfiles = await this.getUnmappedProfiles(mappedProfiles);

    return [...mappedProfiles, ...unmappedProfiles];
  }

  getPhysicalProfiles() {
    return fs.promises.readdir(this.profileDirectory(), {
      withFileTypes: true,
    });
  }

  async getMappedProfiles() {
    return JSON.parse(
      await fs.promises.readFile(this.profileMappingFile(), "utf-8")
    ) as FriendlyDirectoryMap[];
  }

  async getUnmappedProfiles(mappedProfiles: FriendlyDirectoryMap[]) {
    return (
      (await this.getPhysicalProfiles())
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter(isNotJunk)
        .map(
          (preset): FriendlyDirectoryMap => ({ real: preset, friendly: preset })
        )
        // Remove any profiles that have a mapping
        .filter(
          (unmappedPreset) =>
            !mappedProfiles.find(
              (mappedPreset: FriendlyDirectoryMap) =>
                mappedPreset.real === unmappedPreset.real
            )
        )
    );
  }

  async getProfileDirectories() {
    return (await this.getPhysicalProfiles()).map(
      ({ name }) => `${this.profileDirectory()}/${name}`
    );
  }

  async getBackedUpProfiles() {
    return fs.promises.readdir(this.profileBackupDirectory());
  }

  async getBackedUpProfileDirectories() {
    return (await this.getBackedUpProfiles()).map(
      (profile) => `${this.profileBackupDirectory()}/${profile}`
    );
  }

  prependProfileDirectory(profile: string) {
    return `${this.profileDirectory()}/${profile}`;
  }

  /**
   * Return the current profile preference or the first if it is invalid
   */
  async getProfilePreference() {
    return this.configService.getPreference<string>(
      USER_PREFERENCE_KEYS.PRESET
    );
  }

  async getDefaultPreference() {
    return (
      (await this.getPhysicalProfiles())[0]?.name ??
      (() => {
        throw new Error("No physical profiles found");
      })()
    );
  }

  setProfilePreference(profile: string) {
    this.configService.setPreference(USER_PREFERENCE_KEYS.PRESET, profile);
  }

  async isInProfileList(profile: string) {
    return (
      (await this.getPhysicalProfiles()).filter(({ name }) => name === profile)
        .length > 0
    );
  }

  async isValid(profile: string) {
    return this.isInProfileList(profile);
  }

  async backupOriginalProfiles() {
    const backupExists = existsSync(this.profileBackupDirectory());
    this.logger.debug(`Backup for profiles exists: ${backupExists}`);

    if (!backupExists) {
      this.logger.info("No profiles backup exists. Backing up...");
      await fs.promises.mkdir(this.configService.backupDirectory(), {
        recursive: true,
      });

      await copy(this.profileDirectory(), this.profileBackupDirectory());
    }
  }

  async restoreProfiles() {
    this.logger.info("Restoring MO2 profiles");
    await copy(this.profileBackupDirectory(), this.profileDirectory(), {
      overwrite: true,
    });
  }
}
