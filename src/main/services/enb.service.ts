import fs from "fs";
import { ConfigService } from "@/main/services/config.service";
import { copy, existsSync } from "fs-extra";
import { not as isNotJunk } from "junk";
import type { FriendlyDirectoryMap } from "@/shared/types/modpack-metadata";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { service } from "@loopback/core";
import { BindingScope, inject, injectable } from "@loopback/context";
import type { AdditionalInstruction } from "@/shared/types/additional-instructions";
import { InstructionService } from "@/main/services/instruction.service";
import { Logger, LoggerBinding } from "@/main/logger";
import { NoEnbsError } from "@/shared/errors/no-enbs.error";
import type { NonEmptyArray } from "@/shared/types/non-empty-array";

const noEnb = "noEnb";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class EnbService {
  private enbNameMappingFile = "namesENB.json";

  constructor(
    @service(ConfigService) private configService: ConfigService,
    @service(InstructionService)
    private modpackInstructionsService: InstructionService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  private static getEnbInstruction(instruction: AdditionalInstruction) {
    return instruction.type === "enb";
  }

  enbDirectory() {
    return `${this.configService.getPreference(
      USER_PREFERENCE_KEYS.MOD_DIRECTORY
    )}/launcher/ENB Presets`;
  }

  async getEnbPresets(): Promise<NonEmptyArray<FriendlyDirectoryMap>> {
    const mappedEnbs = JSON.parse(
      await fs.promises.readFile(
        `${this.configService.getPreference(
          USER_PREFERENCE_KEYS.MOD_DIRECTORY
        )}/launcher/${this.enbNameMappingFile}`,
        "utf-8"
      )
    ) as FriendlyDirectoryMap[];

    const unmappedEnbs = (
      await fs.promises.readdir(this.enbDirectory(), { withFileTypes: true })
    )
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name)
      .filter(isNotJunk)
      .map((enb): FriendlyDirectoryMap => ({ real: enb, friendly: enb }))
      // Remove any ENBs that have a mapping
      .filter(
        (unmappedEnb) =>
          !mappedEnbs.find(
            (mappedEnb: FriendlyDirectoryMap) =>
              mappedEnb.real === unmappedEnb.real
          )
      );

    if (mappedEnbs.length === 0 && unmappedEnbs.length === 0) {
      throw new NoEnbsError("No enbs found");
    }

    return [
      ...mappedEnbs,
      ...unmappedEnbs,
      {
        real: noEnb,
        friendly: "No Shaders",
      },
    ];
  }

  async getEnbPreference() {
    return this.configService.getPreference<string>(
      USER_PREFERENCE_KEYS.ENB_PROFILE
    ) as string;
  }

  async getDefaultPreference() {
    return (await this.getEnbPresets())[0].real;
  }

  isValid(preset: string) {
    return this.isInPresetList(preset);
  }

  async isInPresetList(preset: string) {
    const presets = await this.getEnbPresets();
    const isInList = presets.filter(({ real }) => real === preset).length > 0;
    if (!isInList) {
      this.logger.debug(
        `enb preset "${preset}" in not in preset list: ${JSON.stringify(
          presets
        )}`
      );
    }
    return isInList;
  }

  async resetCurrentEnb(sync = true) {
    return this.setEnb(await this.getEnbPreference(), sync);
  }

  async setEnb(enb: string, sync = true) {
    const previousEnb = this.configService.getPreference(
      USER_PREFERENCE_KEYS.ENB_PROFILE
    );
    this.configService.setPreference(
      USER_PREFERENCE_KEYS.PREVIOUS_ENB_PROFILE,
      previousEnb
    );
    this.configService.setPreference(USER_PREFERENCE_KEYS.ENB_PROFILE, enb);
    await this.copyEnbFiles(enb, sync);
    return this.postSetEnb(enb);
  }

  /**
   * Actions to perform after setting the enb.
   * Defined in additional-instructions.json
   */
  async postSetEnb(enb: string) {
    this.logger.info("Handling additional enb set instructions");
    const modpackEnbInstructions = this.modpackInstructionsService
      .getInstructions()
      .filter(EnbService.getEnbInstruction);

    if (modpackEnbInstructions.length > 0) {
      this.logger.debug(
        `Found modpack instructions: ${JSON.stringify(modpackEnbInstructions)}`
      );
      await this.modpackInstructionsService.execute(
        modpackEnbInstructions,
        enb
      );
    }
  }

  async backupOriginalEnbs() {
    const enbBackupDirectory = `${this.configService.backupDirectory()}/ENB Presets`;
    const backupExists = existsSync(enbBackupDirectory);
    this.logger.debug(`Backup for ENBs exists: ${backupExists}`);

    if (!backupExists) {
      this.logger.info("No ENB backup exists. Backing up...");
      await fs.promises.mkdir(this.configService.backupDirectory(), {
        recursive: true,
      });

      await copy(this.enbDirectory(), enbBackupDirectory);
    }
  }

  async restoreEnbPresets() {
    this.logger.info("Restoring ENB presets");
    const enbBackupDirectory = `${this.configService.backupDirectory()}/ENB Presets`;
    await copy(enbBackupDirectory, this.enbDirectory(), { overwrite: true });
    await this.copyEnbFiles(
      this.configService.getPreference(USER_PREFERENCE_KEYS.ENB_PROFILE),
      false
    );
  }

  /**
   * Get all ENB files from all presets.
   * Different presets can have different files,
   * this will list all possible files.
   */
  async getAllPossibleEnbFiles() {
    const files = [];
    for (const enb of (await this.getEnbPresets()).filter(
      (x) => x.real !== noEnb
    )) {
      files.push(
        await fs.promises.readdir(`${this.enbDirectory()}/${enb.real}`)
      );
    }
    // Flatten and remove duplicates
    return new Set([...files.flat().filter(isNotJunk)]);
  }

  async getExistingEnbFiles() {
    const enbFiles = await this.getAllPossibleEnbFiles();
    return (
      await fs.promises.readdir(this.configService.skyrimDirectory())
    ).filter((file) => enbFiles.has(file));
  }

  async getEnbFilesForPreset(preset: string) {
    return fs.promises.readdir(`${this.enbDirectory()}/${preset}`);
  }

  /**
   * Deletes all ENB files from the Skyrim directory.
   * Different ENB presets will contain different files,
   * so all presets need to be read to ensure everything is removed
   */
  async deleteAllEnbFiles() {
    this.logger.info("Deleting ENB Files");

    const existingEnbFiles = await this.getExistingEnbFiles();

    for (const file of existingEnbFiles) {
      const fileWithPath = `${this.configService.skyrimDirectory()}/${file}`;
      this.logger.debug(`Deleting ENB file ${file} with path ${fileWithPath}`);
      const isDirectory = (await fs.promises.lstat(fileWithPath)).isDirectory();
      await fs.promises.rm(fileWithPath, { recursive: isDirectory });
    }
  }

  async syncEnbFromGameToPresets(preset: string | typeof noEnb) {
    this.logger.info(`Syncing ENB changes back to presets for ${preset}`);
    if (preset !== noEnb) {
      const enbFiles = await this.getEnbFilesForPreset(preset);
      this.logger.debug(
        `ENB files that need to be synced: ${JSON.stringify(enbFiles)}`
      );

      for (const file of enbFiles) {
        const fileWithPath = `${this.configService.skyrimDirectory()}/${file}`;
        const fileDestination = `${this.enbDirectory()}/${preset}/${file}`;
        this.logger.debug(`Copying ${file} to ${fileDestination}`);
        if (existsSync(fileWithPath)) {
          await copy(fileWithPath, fileDestination, { overwrite: true });
        }
      }
    }

    this.logger.info("Finished syncing ENB presets");
  }

  /**
   * Copy all ENB files from an ENB preset
   * @param profile - Must be the actual ENB profile name, not the friendly name. noEnb will remove all ENB files.
   * @param sync - Whether to sync the changes from Stock Game back to the ENB Preset directory
   */
  async copyEnbFiles(profile: string | typeof noEnb, sync = true) {
    this.logger.info(`Copying ${profile} ENB Files prerequisite`);

    const previousProfile =
      (this.configService.getPreference(
        USER_PREFERENCE_KEYS.PREVIOUS_ENB_PROFILE
      ) as string) || "";
    if (sync && previousProfile && previousProfile !== noEnb) {
      // Sync the previous profile first so changes are not lost
      await this.syncEnbFromGameToPresets(previousProfile);
    }

    await this.deleteAllEnbFiles();

    this.logger.info(`Copying ${profile} ENB Files`);

    // All ENB files have been deleted already so nothing to do if the preset is noEnb
    if (profile !== noEnb) {
      const enbFiles = await this.getEnbFilesForPreset(profile);

      for (const file of enbFiles) {
        const fileWithPath = `${this.enbDirectory()}/${profile}/${file}`;
        const fileDestination = `${this.configService.skyrimDirectory()}/${file}`;
        this.logger.debug(
          `Copy ENB file ${file} with path ${fileWithPath} to ${fileDestination}`
        );
        await copy(fileWithPath, fileDestination);
      }
    }
  }
}
