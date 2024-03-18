import type Electron from "electron";
import { BrowserWindow, protocol } from "electron";
import { URL } from "url";
import { readFile } from "fs";
import path from "path";
import { appRoot } from "@/main/services/config.service";
import { BindingScope, inject, injectable } from "@loopback/context";
import { Logger, LoggerBinding } from "@/main/logger";
import { IsDevelopmentBinding } from "@/main/bindings/isDevelopment.binding";
import { ElectronBinding } from "@/main/bindings/electron.binding";
import {
  ContextMenu,
  ContextMenuBinding,
} from "@/main/bindings/context-menu.binding";
import { service } from "@loopback/core";
import { Dialog, DialogProvider } from "@/main/services/dialog.service";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class WindowService {
  private window!: BrowserWindow;

  constructor(
    @inject(LoggerBinding) private logger: Logger,
    @inject(IsDevelopmentBinding) private isDevelopment: boolean,
    @inject(ElectronBinding) private electron: typeof Electron,
    @inject(ContextMenuBinding) private contextMenu: ContextMenu,
    @service(DialogProvider) private dialog: Dialog
  ) {}

  setWindow(window: BrowserWindow) {
    this.window = window;
  }
  getWindow() {
    return this.window;
  }

  getWebContents() {
    return this.window.webContents;
  }

  quit() {
    this.logger.debug("Quit application");
    this.electron.app.quit();
  }

  reload() {
    this.logger.debug("Reload window");
    this.getWindow().reload();
  }

  minimize() {
    this.logger.debug("Minimize window");
    this.getWindow().minimize();
  }

  focusWindow() {
    const window = this.getWindow();
    if (window.isMinimized()) {
      window.restore();
    }
    window.focus();
  }

  async createBrowserWindow() {
    this.logger.debug("Creating browser window");

    if (this.window) {
      this.logger.debug("Browser window already exists");
      return;
    }

    try {
      // Add default context menu
      this.contextMenu({
        showSaveImageAs: true,
      });

      // Create the browser window.
      this.window = new this.electron.BrowserWindow({
        frame: false,
        height: 580,
        minHeight: 580,
        maxHeight: 580,
        width: 1000,
        minWidth: 1000,
        maxWidth: 1000,
        resizable: false,
        maximizable: false,
        // disable initial window from showing so focus can be prevented while developing
        show: false,
        webPreferences: {
          // Use pluginOptions.nodeIntegration, leave this alone
          // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(appRoot, "main/preload.js"),
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.handleFatalError("Unable to create browser window", error);
      } else {
        this.handleFatalError(
          "Unable to create browser window with unknown error",
          ""
        );
      }
    }
  }

  /**
   * @param urlPath - Must start with a '/'
   */
  async load(urlPath: string) {
    try {
      if (this.isDevelopment) {
        const url = new URL(`http://localhost:8080/#${urlPath}`).toString();
        await this.navigateInWindow(url);
        if (!process.env["IS_TEST"]) {
          this.window.webContents.openDevTools();
        }
        // Show window without setting focus
        this.window.showInactive();
      } else {
        this.createProtocol("app");
        // Load the index.html when not in development
        const url = new URL(`app://./index.html/#${urlPath}`).toString();
        await this.navigateInWindow(url);
        this.window.show();
      }
    } catch (error) {
      if (error instanceof Error) {
        this.handleFatalError("Unable to load application page", error);
      } else {
        this.handleFatalError(
          "Unable to load application page with unknown error",
          ""
        );
      }
    }
  }

  private handleFatalError(message: string, err: string | Error) {
    this.logger.error(`${message}. ${err}`);

    this.dialog.showMessageBoxSync({
      type: "error",
      title: "A fatal error occurred!",
      message: `
    ${message}
    ${err}
    `,
    });

    this.electron.app.quit();
  }

  async navigateInWindow(url: string) {
    // If the browser window is already open, a URL change will cause electron to think the request is aborted.
    // When the app loads a URL, the hash is changed immediately. If the window is already open,
    // electron considers this a change in URl and a failure so it errors.
    // If the window is open, just navigate from the browser instead.
    this.logger.debug(`Loading url: ${url}`);
    if (this.window.isVisible()) {
      await this.window.webContents.executeJavaScript(
        `window.location.href = '${url}'`
      );
      this.window.reload();
    } else {
      await this.window.loadURL(url);
    }
  }

  // TODO this method is untested because it is essentially a library method.
  // TODO this needs clarifying and simplifying
  /**
   * Taken from vue-cli-plugin-electron-builder to remove import/export because the plugin doesn't ship a dist.
   * If imported directly, it causes issues when dynamically requiring services that might require this file
   */
  /* istanbul ignore next */
  createProtocol(scheme: string) {
    protocol.registerBufferProtocol(scheme, (request, respond) => {
      let pathName = new URL(request.url).pathname;
      pathName = decodeURI(pathName); // Needed in case URL contains spaces

      readFile(path.join(appRoot, pathName), (error, data) => {
        if (error) {
          this.logger.error(
            `Failed to read ${pathName} on ${scheme} protocol`,
            error
          );
        }
        const extension = path.extname(pathName).toLowerCase();
        let mimeType = "";

        if (extension === ".js") {
          mimeType = "text/javascript";
        } else if (extension === ".html") {
          mimeType = "text/html";
        } else if (extension === ".css") {
          mimeType = "text/css";
        } else if (extension === ".svg" || extension === ".svgz") {
          mimeType = "image/svg+xml";
        } else if (extension === ".json") {
          mimeType = "application/json";
        } else if (extension === ".wasm") {
          mimeType = "application/wasm";
        }

        respond({ mimeType, data });
      });
    });
  }
}
