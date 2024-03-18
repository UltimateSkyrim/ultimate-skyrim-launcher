import { WindowService } from "@/main/services/window.service";
import type { ElectronLog } from "electron-log";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import sinon from "sinon";
import {
  expect,
  type StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { getMockElectron } from "@/__tests__/unit/helpers/mocks/electron.mock";
import type { BrowserWindow } from "electron";
import { getMockDialog } from "@/__tests__/unit/helpers/mocks/dialog.mock";

describe("Window Service", () => {
  let windowService: WindowService;

  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;
  let mockElectron: ReturnType<typeof getMockElectron>;
  let mockContextMenu: sinon.SinonStub;
  let mockDialog: StubbedInstanceWithSinonAccessor<Electron.Dialog>;

  let originalEnv: typeof process.env;

  beforeEach(() => {
    originalEnv = { ...process.env };

    mockLogger = getMockLogger();
    mockElectron = getMockElectron();
    mockContextMenu = sinon.stub();
    mockDialog = getMockDialog();

    windowService = new WindowService(
      mockLogger,
      false,
      mockElectron,
      mockContextMenu,
      mockDialog
    );
  });

  afterEach(() => {
    sinon.restore();
    process.env = { ...originalEnv };
  });

  describe("getWindow", () => {
    it("should return the window", async () => {
      windowService.setWindow({ test: 1234 } as unknown as BrowserWindow);
      const window = windowService.getWindow();
      expect(window).to.match({ test: 1234 });
    });
  });

  describe("getWebContents", () => {
    it("should return the web contents", async () => {
      windowService.setWindow({
        webContents: { test: 1234 },
      } as unknown as BrowserWindow);
      const webContents = windowService.getWebContents();
      expect(webContents).to.match({ test: 1234 });
    });
  });

  describe("quit", () => {
    it("should quit the application", async () => {
      windowService.quit();
      sinon.assert.calledOnce(mockElectron.stubs.app.quit);
    });
  });

  describe("reload", () => {
    it("should reload the window", async () => {
      const reloadStub = sinon.stub();
      windowService.setWindow({
        reload: reloadStub,
      } as unknown as BrowserWindow);
      windowService.reload();
      sinon.assert.calledOnce(reloadStub);
    });
  });

  describe("minimize", () => {
    it("should minimize the window", async () => {
      const minimizeStub = sinon.stub();
      windowService.setWindow({
        minimize: minimizeStub,
      } as unknown as BrowserWindow);
      windowService.minimize();
      sinon.assert.calledOnce(minimizeStub);
    });
  });

  describe("focusWindow", () => {
    it("should focus the window", async () => {
      const focusStub = sinon.stub();
      const isMinimizedStub = sinon.stub().returns(false);
      const restoreStub = sinon.stub();
      windowService.setWindow({
        focus: focusStub,
        isMinimized: isMinimizedStub,
        restore: restoreStub,
      } as unknown as BrowserWindow);
      windowService.focusWindow();
      sinon.assert.calledOnce(focusStub);
    });

    it("should restore the window if minimized", async () => {
      const focusStub = sinon.stub();
      const isMinimizedStub = sinon.stub().returns(true);
      const restoreStub = sinon.stub();
      windowService.setWindow({
        focus: focusStub,
        isMinimized: isMinimizedStub,
        restore: restoreStub,
      } as unknown as BrowserWindow);
      windowService.focusWindow();
      sinon.assert.calledOnce(restoreStub);
    });
  });

  describe("createBrowserWindow", () => {
    it("should assign the browser window", async () => {
      await windowService.createBrowserWindow();
      expect(windowService.getWindow()).to.match({
        getAllWindows: mockElectron.stubs.getAllWindows,
      });
    });

    it("should not create a browser window if one already exists", async () => {
      windowService.setWindow({ test: 5678 } as unknown as BrowserWindow);
      await windowService.createBrowserWindow();
      expect(
        mockLogger.debug.calledWith("Browser window already exists")
      ).to.be.true();
    });

    it("should add a default context menu", async () => {
      await windowService.createBrowserWindow();
      sinon.assert.calledWith(mockContextMenu, {
        showSaveImageAs: true,
      });
    });

    it("should handle the error if creating a browser window fails", async () => {
      const error = new Error("test error");
      mockElectron.stubs.BrowserWindow.throws(error);
      await windowService.createBrowserWindow();
      sinon.assert.calledWith(mockDialog.stubs.showMessageBoxSync, {
        type: "error",
        title: "A fatal error occurred!",
        message:
          "\n    Unable to create browser window\n    Error: test error\n    ",
      });
    });

    it("should handle unknown errors", async () => {
      const mockNonError = { message: "test error" };
      mockElectron.stubs.BrowserWindow.throws(mockNonError);
      await windowService.createBrowserWindow();
      sinon.assert.calledWith(mockDialog.stubs.showMessageBoxSync, {
        type: "error",
        title: "A fatal error occurred!",
        message:
          "\n    Unable to create browser window with unknown error\n    \n    ",
      });
    });
  });

  describe("load", () => {
    it("should load the local url if in development", async () => {
      windowService = new WindowService(
        mockLogger,
        true,
        mockElectron,
        mockContextMenu,
        mockDialog
      );

      const openDevToolsStub = sinon.stub();
      const showInactiveStub = sinon.stub();

      windowService.setWindow({
        webContents: {
          openDevTools: openDevToolsStub,
        },
        showInactive: showInactiveStub,
      } as unknown as BrowserWindow);

      const navigateStub = sinon.stub(windowService, "navigateInWindow");

      await windowService.load("/test");

      sinon.assert.calledWith(navigateStub, "http://localhost:8080/#/test");
      sinon.assert.calledOnce(openDevToolsStub);
      sinon.assert.calledOnce(showInactiveStub);
    });

    it("should not open the dev tools if IS_TEST is true", async () => {
      windowService = new WindowService(
        mockLogger,
        true,
        mockElectron,
        mockContextMenu,
        mockDialog
      );

      process.env["IS_TEST"] = "true";

      const openDevToolsStub = sinon.stub();
      const showInactiveStub = sinon.stub();

      windowService.setWindow({
        webContents: {
          openDevTools: openDevToolsStub,
        },
        showInactive: showInactiveStub,
      } as unknown as BrowserWindow);

      const navigateStub = sinon.stub(windowService, "navigateInWindow");

      await windowService.load("/test");

      sinon.assert.calledWith(navigateStub, "http://localhost:8080/#/test");
      sinon.assert.notCalled(openDevToolsStub);
      sinon.assert.calledOnce(showInactiveStub);
    });

    it("should load the app url if not in development", async () => {
      const showStub = sinon.stub();

      windowService.setWindow({
        show: showStub,
      } as unknown as BrowserWindow);

      const navigateStub = sinon.stub(windowService, "navigateInWindow");
      const createProtocolStub = sinon.stub(windowService, "createProtocol");

      await windowService.load("/test");

      sinon.assert.calledWith(navigateStub, "app://./index.html/#/test");
      sinon.assert.calledOnce(createProtocolStub);
      sinon.assert.calledOnce(showStub);
    });

    it("should handle the error if loading the local url fails", async () => {
      const error = new Error("test error");
      const createProtocolStub = sinon.stub(windowService, "createProtocol");
      createProtocolStub.throws(error);
      await windowService.load("/test");
      sinon.assert.calledWith(mockDialog.stubs.showMessageBoxSync, {
        type: "error",
        title: "A fatal error occurred!",
        message:
          "\n    Unable to load application page\n    Error: test error\n    ",
      });
    });

    it("should handle unknown errors", async () => {
      const mockNonError = { message: "test error" };
      const createProtocolStub = sinon.stub(windowService, "createProtocol");
      createProtocolStub.throws(mockNonError);
      await windowService.load("/test");
      sinon.assert.calledWith(mockDialog.stubs.showMessageBoxSync, {
        type: "error",
        title: "A fatal error occurred!",
        message:
          "\n    Unable to load application page with unknown error\n    \n    ",
      });
    });
  });

  describe("navigateInWindow", () => {
    it("should navigate to the url", async () => {
      const loadURLStub = sinon.stub();
      windowService.setWindow({
        loadURL: loadURLStub,
        isVisible: () => false,
      } as unknown as BrowserWindow);
      await windowService.navigateInWindow("test");
      sinon.assert.calledWith(loadURLStub, "test");
    });

    it("should reload if the window is already visible", async () => {
      const executeJavaScriptStub = sinon.stub();
      const reloadStub = sinon.stub();
      windowService.setWindow({
        webContents: {
          executeJavaScript: executeJavaScriptStub,
        },
        isVisible: () => true,
        reload: reloadStub,
      } as unknown as BrowserWindow);
      await windowService.navigateInWindow("test");
      sinon.assert.calledWith(
        executeJavaScriptStub,
        "window.location.href = 'test'"
      );
      sinon.assert.calledOnce(reloadStub);
    });
  });
});
