import { BindingScope, inject, injectable } from "@loopback/context";
import { service } from "@loopback/core";
import { app } from "electron";
import { ModpackService } from "@/main/services/modpack.service";
import { LauncherService } from "@/main/services/launcher.service";
import { platform, type, version } from "os";
import { WabbajackService } from "@/main/services/wabbajack.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { UpdateService } from "@/main/services/update.service";
import { BlacklistService } from "@/main/services/blacklist.service";
import { ErrorService } from "@/main/services/error.service";
import { WindowService } from "@/main/services/window.service";
import { Logger, LoggerBinding } from "@/main/logger";

interface StartupCommand {
  // Only needed if the command is being filtered
  id?: string;
  name: string;
  execute: () => unknown;
  // Only run certain startup if the modpack is set
  requiresModpack?: boolean;
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
    @inject(LoggerBinding) private logger: Logger
  ) {}

  public registerStartupCommands(filter?: string) {
    this.startupCommands = [
      {
        name: "Startup logs",
        execute: async () => {
          this.logger.debug(`
            --- Startup debug logs ---
            OS: ${type()} ${platform()} ${version()}
            Modpack version: ${await this.wabbajackService.getModpackVersion()}
            Launcher version: ${app.getVersion()} 
            Modpack path: ${this.modpackService.getModpackDirectory()}
            Current screen resolution: ${JSON.stringify(
              this.resolutionService.getCurrentResolution()
            )}
          `);
        },
      },
      {
        name: "Auto update",
        execute: async () => await this.updateService.update(),
      },
      {
        id: "processBlacklist",
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
            await this.errorService.handleError(
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
        name: "Select modpack",
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
