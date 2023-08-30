import { BindingScope, inject, injectable } from "@loopback/context";
import { service } from "@loopback/core";
import type Electron from "electron";
import { ModpackService } from "@/main/services/modpack.service";
import { LauncherService } from "@/main/services/launcher.service";
import * as os from "os";
import { platform, type, version } from "os";
import { WabbajackService } from "@/main/services/wabbajack.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { UpdateService } from "@/main/services/update.service";
import { BlacklistService } from "@/main/services/blacklist.service";
import { ErrorService } from "@/main/services/error.service";
import { WindowService } from "@/main/services/window.service";
import { Logger, LoggerBinding } from "@/main/logger";
import { ElectronBinding } from "@/main/bindings/electron.binding";

interface StartupCommand {
  // Only needed if the command is being filtered
  id?: string;
  name: string;
  execute: () => unknown;
  // Only run certain startup if the modpack is set
  requiresModpack?: boolean;
}

export const enum COMMAND_IDS {
  STARTUP_LOGS = "STARTUP_LOGS",
  PROCESS_BLACKLIST = "PROCESS_BLACKLIST",
  CHECK_MODPACK_PATH = "CHECK_MODPACK_PATH",
  UPDATE = "UPDATE",
  REFRESH_MODPACK = "REFRESH_MODPACK",
}

@injectable({
  scope: BindingScope.SINGLETON,
})
export class StartupService {
  private startupCommands: StartupCommand[] = [];

  constructor(
    @service(ModpackService) private modpackService: ModpackService,
    @service(LauncherService) private launcherService: LauncherService,
    @service(WabbajackService) private wabbajackService: WabbajackService,
    @service(ResolutionService) private resolutionService: ResolutionService,
    @service(UpdateService) private updateService: UpdateService,
    @service(BlacklistService) private blacklistService: BlacklistService,
    @service(ErrorService) private errorService: ErrorService,
    @service(WindowService) private windowService: WindowService,
    @inject(ElectronBinding) private electron: typeof Electron,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  public registerStartupCommands(filter?: COMMAND_IDS) {
    this.startupCommands = [
      {
        id: COMMAND_IDS.STARTUP_LOGS,
        name: "Startup logs",
        execute: async () => {
          this.logger.debug(
            [
              "--- Startup debug logs ---",
              `OS: ${type()} ${platform()} ${version()}`,
              `Modpack version: ${await this.wabbajackService.getModpackVersion()}`,
              `Launcher version: ${this.electron.app.getVersion()}`,
              `Modpack path: ${this.modpackService.getModpackDirectory()}`,
              `Current screen resolution: ${JSON.stringify(
                this.resolutionService.getCurrentResolution()
              )}`,
              "--- End startup debug logs ---",
            ].join(os.EOL)
          );
        },
      },
      {
        id: COMMAND_IDS.UPDATE,
        name: "Auto update",
        execute: async () => this.updateService.update(),
      },
      {
        id: COMMAND_IDS.PROCESS_BLACKLIST,
        name: "Check if blacklisted process is running",
        execute: async () => {
          const runningBlacklistedProcesses =
            await this.blacklistService.blacklistedProcessesRunning();
          if (runningBlacklistedProcesses[0]) {
            // Throw an error and don't continue until the process has been closed
            this.logger.debug(
              `Blacklisted process running ${JSON.stringify(
                runningBlacklistedProcesses
              )}`
            );
            this.errorService.handleError(
              "Incompatible program running",
              `
               Please note that ${runningBlacklistedProcesses[0].name} is incompatible with the modpack/launcher.
               Please close ${runningBlacklistedProcesses[0].name} before continuing.
               The launcher will now close to prevent further issues.`
            );
            this.windowService.quit();
          }
        },
      },
      {
        id: COMMAND_IDS.CHECK_MODPACK_PATH,
        name: "Check for invalid modpack preference",
        execute: () => {
          if (!this.modpackService.checkCurrentModpackPathIsValid()) {
            const modpackDirectory = this.modpackService.getModpackDirectory();
            this.logger.error(
              `Current selected modpack (${modpackDirectory}) is invalid. Removing so the user can select a valid one.`
            );
            this.modpackService.deleteModpackDirectory();
          }
        },
        requiresModpack: true,
      },
      {
        id: COMMAND_IDS.REFRESH_MODPACK,
        name: "Refresh modpack selection",
        execute: () => this.launcherService.refreshModpack(),
        requiresModpack: true,
      },
    ];

    if (filter) {
      this.startupCommands = this.startupCommands.filter(
        ({ id }) => id === filter
      );
    }
  }

  public getStartupCommands() {
    return this.startupCommands;
  }

  public async runStartup() {
    for (const command of this.startupCommands) {
      if (
        (command.requiresModpack && this.modpackService.isModpackSet()) ||
        !command.requiresModpack
      ) {
        this.logger.debug(`Running startup command: ${command.name}`);
        await command.execute();
        this.logger.debug(`Command "${command.name}" completed`);
      }
    }
  }
}
