import path from "path";
import { BindingScope, inject, injectable } from "@loopback/context";
import fs, { createWriteStream } from "fs";
import { service } from "@loopback/core";
import { ConfigService } from "@/main/services/config.service";
import { ErrorService } from "@/main/services/error.service";
import { pipeline } from "stream/promises";
import fetch from "node-fetch";
import { promisify } from "util";
import { reboot } from "electron-shutdown-command";
import { getAllInstalledSoftware } from "fetch-installed-software";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { Logger, LoggerBinding } from "@/main/logger";
import { ElectronBinding } from "@/main/bindings/electron.binding";
import {
  ChildProcess,
  ChildProcessBinding,
} from "@/main/bindings/child-process.binding";
import { type PSList, PsListBinding } from "@/main/bindings/psList.binding";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class SystemService {
  constructor(
    @service(ConfigService) private configService: ConfigService,
    @service(ErrorService) private errorService: ErrorService,
    @inject(LoggerBinding) private logger: Logger,
    @inject(ElectronBinding) private electron: typeof Electron,
    @inject(ChildProcessBinding) private childProcess: ChildProcess,
    @inject(PsListBinding) private psList: PSList
  ) {}

  static getLocalAppData() {
    return path.resolve(`${process.env["APPDATA"]}/../local`);
  }

  public getCPlusPlusInstallerFile() {
    return path.normalize(
      `${this.electron.app.getPath("userData")}/vc_redist.x64.exe`
    );
  }

  reboot() {
    this.logger.debug("Rebooting system");
    reboot();
  }

  async openApplicationLogsPath() {
    const error = await this.electron.shell.openPath(
      path.parse(this.logger.transports?.file.getFile().path).dir
    );
    if (error) {
      this.logger.error(error);
    }
  }

  async openCrashLogs() {
    const logPath = path.join(
      this.configService.modDirectory(),
      "/overwrite/NetScriptFramework/Crash"
    );

    if (fs.existsSync(logPath)) {
      const error = await this.electron.shell.openPath(logPath);
      if (error) {
        this.logger.error(error);
      }
    } else {
      this.errorService.handleError(
        "Error while opening crash logs folder",
        `Crash logs directory at ${logPath} does not exist. This likely means you do not have any crash logs.`
      );
    }
  }

  async clearApplicationLogs() {
    this.logger.transports?.file.getFile().clear();
    /*
    Due to the fact that the renderer proc has little to no node func / lib access,
    the renderer logs have to be manually cleared here.
    Because even if the entire logging object is exposed to the renderer it is unable to clear the file.
    */
    const logFilePath = this.logger.transports?.file.getFile().path;
    const loggerDir = path.dirname(logFilePath);
    const renderLog = path.join(loggerDir, "renderer.log");

    //clear renderer.log
    if (fs.existsSync(renderLog)) {
      await fs.promises.writeFile(renderLog, "", { flag: "w" });
    }
  }

  async checkPrerequisitesInstalled() {
    this.logger.debug("Checking prerequisites are installed");

    if (
      this.configService.getPreference(
        USER_PREFERENCE_KEYS.CHECK_PREREQUISITES
      ) === false
    ) {
      this.logger.debug("Skip checking prerequisites due to user setting");
      return true;
    }

    const productTester = "C++";
    const installedSoftware = (await getAllInstalledSoftware())
      .filter((x) => x.DisplayName?.includes(productTester))
      .map((x) => x.DisplayName);

    if (installedSoftware.length === 0) {
      this.logger.debug(`${productTester} not detected`);
      return false;
    }

    const installedVersions = installedSoftware.map(
      (softwareName) =>
        // Capture digits after Microsoft Visual C++ as this is the version
        softwareName?.split(/Microsoft Visual C\+\+ (\d+)/)[1]
    );

    const sortedVersions = [...new Set(installedVersions.sort())];
    this.logger.debug(`Installed ${productTester} versions ${sortedVersions}`);

    return installedVersions.filter((x) => Number(x) >= 2019).length > 0;
  }

  async installPrerequisites() {
    await this.downloadPrerequisites();
    this.logger.debug("Downloads completed");
    this.logger.debug(`Installing ${this.getCPlusPlusInstallerFile()}`);
    return promisify(this.childProcess.exec)(
      `"${this.getCPlusPlusInstallerFile()}"`
    );
  }

  async downloadPrerequisites() {
    this.logger.debug("Downloading prerequisites");
    await this.downloadFile(
      "https://aka.ms/vs/17/release/vc_redist.x64.exe",
      this.getCPlusPlusInstallerFile()
    );
  }

  async downloadFile(url: string, output: string) {
    if (fs.existsSync(output)) {
      this.logger.debug("Download already exists, skipping");
      return;
    }

    this.logger.debug(`Downloading from ${url} to ${output}`);

    const response = await fetch(url);

    if (!response.ok) {
      const message = `Failed to download file from ${url} with response status ${response.status}`;
      this.logger.error(message);
      throw new Error(message);
    }

    const body = response.body;

    this.logger.debug(`Download complete, writing to ${output}`);
    await pipeline(body, createWriteStream(output));
    this.logger.debug(`Finished writing to ${output}`);
  }

  async isProcessRunning(process: string): Promise<boolean> {
    return (
      (await this.psList()).filter(
        ({ name }) => name.toLowerCase() === process.toLowerCase()
      ).length > 0
    );
  }
}
