import type Electron from "electron";
import path from "path";
import fs from "fs";
import { service } from "@loopback/core";
import { WindowService } from "@/main/services/window.service";
import { BindingScope, inject, injectable } from "@loopback/context";
import { UPDATE_EVENTS } from "@/main/controllers/update/update.events";
import { ErrorService } from "@/main/services/error.service";
import { Logger, LoggerBinding } from "@/main/logger";
import { IsDevelopmentBinding } from "@/main/bindings/isDevelopment.binding";
import { AutoUpdaterBinding } from "@/main/bindings/autoUpdater.binding";
import type { AppUpdater } from "electron-updater";
import { ElectronBinding } from "@/main/bindings/electron.binding";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class UpdateService {
  private devAppUpdatePath = path.join(
    __dirname,
    "../../../dev-app-update.yml"
  );

  constructor(
    @service(ErrorService) private errorService: ErrorService,
    @service(WindowService) private windowService: WindowService,
    @inject(LoggerBinding) private logger: Logger,
    @inject(IsDevelopmentBinding) private isDevelopment: boolean,
    @inject(AutoUpdaterBinding) private autoUpdater: AppUpdater,
    @inject(ElectronBinding) private electron: typeof Electron
  ) {}

  async update() {
    await this.windowService.createBrowserWindow();
    await this.windowService.load("/auto-update");

    return new Promise<void>((resolve) => {
      // Only register if there is no update available. If there is an update, the window will close itself anyway.
      this.autoUpdater.on(UPDATE_EVENTS.UPDATE_NOT_AVAILABLE, () => {
        this.logger.debug("No update available");
        resolve();
      });

      if (this.shouldUpdate()) {
        this.checkForUpdate().catch((error) => {
          this.logger.debug(
            `Update failed with error ${error}. Continuing anyway.`
          );
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  shouldUpdate() {
    let shouldUpdate;

    if (this.isDevelopment && fs.existsSync(this.devAppUpdatePath)) {
      this.logger.debug(`Setting auto update path to ${this.devAppUpdatePath}`);
      this.autoUpdater.updateConfigPath = this.devAppUpdatePath;
      shouldUpdate = true;
    } else if (this.isDevelopment) {
      this.logger.debug(
        "Skipping app update check because we're in development mode"
      );
      shouldUpdate = false;
    } else if (this.electron.app.getVersion().includes("-")) {
      this.logger.debug(
        "Skipping app update check because this is a pre-release version"
      );
      shouldUpdate = false;
    } else {
      shouldUpdate = true;
    }

    return shouldUpdate;
  }

  registerEvents() {
    this.autoUpdater.on(UPDATE_EVENTS.UPDATE_AVAILABLE, () => {
      this.logger.info(`Update available`);
      this.windowService.getWebContents().send(UPDATE_EVENTS.UPDATE_AVAILABLE);
    });

    this.autoUpdater.on(UPDATE_EVENTS.DOWNLOAD_PROGRESS, ({ percent }) => {
      this.windowService
        .getWebContents()
        .send(UPDATE_EVENTS.DOWNLOAD_PROGRESS, Math.floor(percent));
    });

    this.autoUpdater.on(UPDATE_EVENTS.UPDATE_DOWNLOADED, () => {
      this.logger.debug("Update downloaded");
      this.autoUpdater.quitAndInstall();
    });

    this.autoUpdater.on(UPDATE_EVENTS.ERROR, (error: Error) => {
      let message;
      if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
        message = `This likely means you are not connected to the internet. It is recommended you use the latest launcher version as it might contain bug fixes for the modpack itself.`;
      } else {
        message = `An unknown error has occurred. Please try relaunching the launcher.`;
      }

      this.errorService.handleError(
        "Error checking for update",
        `Cannot check for update. ${message}`
      );
    });
  }

  async checkForUpdate() {
    this.registerEvents();
    const updateCheckResult = await this.autoUpdater.checkForUpdates();
    this.logger.debug("Auto update check result");
    this.logger.debug(updateCheckResult);
  }
}
