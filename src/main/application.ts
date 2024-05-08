import { StartupService } from "@/main/services/startup.service";
import type { Constructor } from "@loopback/context";
import { WindowService } from "@/main/services/window.service";
import { LoggerBinding } from "@/main/logger";
import { BootMixin } from "@loopback/boot";
import { Application } from "@loopback/core";
import type { Controller } from "@/main/decorators/controller.decorator";
import { ErrorService } from "@/main/services/error.service";
import logger from "electron-log";
import { VersionBinding } from "@/main/bindings/version.binding";
import electron, { app } from "electron";
import { IsDevelopmentBinding } from "@/main/bindings/isDevelopment.binding";
import { ChildProcessBinding } from "@/main/bindings/child-process.binding";
import * as child_process from "child_process";
import { PsListBinding } from "@/main/bindings/psList.binding";
import psList from "ps-list";
import { ElectronBinding } from "@/main/bindings/electron.binding";
import { AutoUpdaterBinding } from "@/main/bindings/autoUpdater.binding";
import { autoUpdater } from "electron-updater";
import contextMenu from "electron-context-menu";
import { ContextMenuBinding } from "@/main/bindings/context-menu.binding";
import { ConfigBinding } from "@/main/bindings/config.binding";
import { ConfigService } from "@/main/services/config.service";

const serviceNamespace = "services";

export class LauncherApplication extends BootMixin(Application) {
  constructor() {
    super();

    this.bindLogger();

    this.projectRoot = __dirname;

    this.onStart(async () => {
      try {
        await this.registerHandlers();

        const startupService = await this.getServiceByClass(StartupService);
        startupService.registerStartupCommands();
        await startupService.runStartup();

        await this.startBrowser();
      } catch (error) {
        const errorService = await this.getServiceByClass(ErrorService);
        errorService.handleError(
          "Failed to start application",
          (error as Error).message
        );
        process.exit(1);
      }
    });

    this.bindStaticValues();

    this.bootOptions = {
      controllers: {
        dirs: ["controllers"],
        extensions: [".controller.ts", ".controller.js"],
        nested: true,
      },
      services: {
        dirs: ["services"],
        extensions: [
          ".service.ts",
          ".service.js",
          ".provider.ts",
          ".provider.js",
        ],
        nested: true,
      },
    };
  }

  public getServiceByClass<T>(cls: Constructor<T>): Promise<T> {
    return this.get(`${serviceNamespace}.${cls.name}`);
  }

  public getServiceByClassSync<T>(cls: Constructor<T>): T {
    return this.getSync(`${serviceNamespace}.${cls.name}`);
  }

  private async registerHandlers() {
    logger.silly("Registering handlers");

    for (const controllerBinding of this.findByTag("controller")) {
      (await this.get<Controller>(controllerBinding.key)).registerHandlers();
    }

    logger.silly("Registered handlers");
  }

  private async startBrowser() {
    const renderService = await this.getServiceByClass(WindowService);
    await renderService.createBrowserWindow();
    await renderService.load("/");
  }

  private bindLogger() {
    this.bind(LoggerBinding).to(logger.create("launcher"));
  }

  private bindStaticValues() {
    this.bind(ElectronBinding).to(electron);
    this.bind(VersionBinding).to(app.getVersion());
    this.bind(IsDevelopmentBinding).to(!app.isPackaged);
    this.bind(ChildProcessBinding).to(child_process);
    this.bind(PsListBinding).to(psList);
    this.bind(AutoUpdaterBinding).to(autoUpdater);
    this.bind(ContextMenuBinding).to(contextMenu);
    this.bind(ConfigBinding).to(ConfigService.getNewUserPreferencesStore());
  }
}
