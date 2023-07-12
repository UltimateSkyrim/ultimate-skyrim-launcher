import { app, protocol } from "electron";
import { isDevelopment } from "./main/services/config.service";
import { autoUpdater } from "electron-updater";
import { LauncherApplication } from "./main/application";
import { ErrorService } from "./main/services/error.service";
import { WindowService } from "./main/services/window.service";
import { newLogInstance } from "./main/logger";

const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
}

const logger = newLogInstance("Startup logger");

// Ensure it's easy to tell where the logs for this application start
const initialLog = `|             ${new Date().toLocaleString()}             |`;
logger.debug("-".repeat(initialLog.length));
logger.debug(initialLog);
logger.debug("-".repeat(initialLog.length));
autoUpdater.logger = require("electron-log");

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: "app", privileges: { secure: true, standard: true } },
]);

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === "win32") {
    process.on("message", (data) => {
      if (data === "graceful-exit") {
        app.quit();
      }
    });
  } else {
    process.on("SIGTERM", () => {
      app.quit();
    });
  }

  if (process.platform !== "win32") {
    if (!process.env["APPDATA"]) {
      // The application requires a valid modpack installation.
      // If not working on Windows, this is assumed to be local files generated from `npm run generate:modpack-files` for development purposes.
      process.env["APPDATA"] = `${__dirname}/../mock-files/local`;
    }
  }
}

const start = async () => {
  const launcherApplication = new LauncherApplication();
  await launcherApplication.boot();
  await launcherApplication.start();

  app.on("second-instance", () => {
    const windowService =
      launcherApplication.getServiceByClassSync(WindowService);
    // Someone tried to run a second instance, so focus the original window.
    windowService.focusWindow();
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  start()
    .then(() => logger.debug("App started"))
    .catch((error) => {
      const errorService = new ErrorService(logger);
      errorService.handleError(
        "Failed to start application",
        (error as Error).message
      );
      process.exit(1);
    });
});
