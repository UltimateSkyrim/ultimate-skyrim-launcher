import fs from "fs";
import { MO2Names } from "@/main/services/modOrganizer.service";
import { BindingScope, inject, injectable } from "@loopback/context";
import modpack from "@/main/wildlander/modpack.json";
import type { IsModpackValidResponse } from "@/main/controllers/modpack/mopack.events";
import type { Modpack } from "@/modpack-metadata";
import { service } from "@loopback/core";
import { ConfigService } from "@/main/services/config.service";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { Logger, LoggerBinding } from "@/main/logger";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class ModpackService {
  constructor(
    @service(ConfigService) private configService: ConfigService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  checkModpackPathIsValid(modpackPath: string): IsModpackValidResponse {
    const missingPaths = [MO2Names.MO2EXE, "profiles", "launcher"]
      .filter((path) => !fs.existsSync(`${modpackPath}/${path}`))
      .map((path) => {
        this.logger.warn(
          `Selected mod directory "${modpackPath}" doesn't contain a "${path}" directory/file`
        );
        return path;
      });

    return { ok: missingPaths.length === 0, missingPaths };
  }

  checkCurrentModpackPathIsValid() {
    return (
      this.isModpackSet() &&
      this.checkModpackPathIsValid(this.getModpackDirectory()).ok
    );
  }

  getModpackDirectory() {
    return this.configService.getPreference<string>(
      USER_PREFERENCE_KEYS.MOD_DIRECTORY
    );
  }

  getModpackMetadata(): Modpack {
    return modpack;
  }

  deleteModpackDirectory() {
    return this.configService.deletePreference(
      USER_PREFERENCE_KEYS.MOD_DIRECTORY
    );
  }

  isModpackSet(): boolean {
    return this.configService
      .getPreferences()
      .has(USER_PREFERENCE_KEYS.MOD_DIRECTORY);
  }
}
