import { UpdateService } from "@/main/services/update.service";
import { WindowService } from "@/main/services/window.service";
import {
  createStubInstance,
  expect,
  sinon,
  type StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { ErrorService } from "@/main/services/error.service";
import type { ElectronLog } from "electron-log";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { getAutoUpdaterMock } from "@/__tests__/unit/helpers/mocks/autoUpdater.mock";
import { UPDATE_EVENTS } from "@/main/controllers/update/update.events";
import type { AppUpdater } from "electron-updater";
import type Electron from "electron";
import mockFs from "mock-fs";
import path from "path";

describe("UpdateService", () => {
  let updateService: UpdateService;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockWindowService: StubbedInstanceWithSinonAccessor<WindowService>;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;
  let autoUpdaterStub: StubbedInstanceWithSinonAccessor<AppUpdater>;
  let mockElectron: typeof Electron;
  let versionStub: sinon.SinonStub;

  beforeEach(() => {
    mockWindowService = createStubInstance(WindowService);
    mockErrorService = createStubInstance(ErrorService);
    mockLogger = getMockLogger();
    autoUpdaterStub = getAutoUpdaterMock();
    versionStub = sinon.stub();
    mockElectron = {
      app: {
        getVersion: versionStub,
      },
    } as unknown as typeof Electron;

    updateService = new UpdateService(
      mockErrorService,
      mockWindowService,
      mockLogger,
      true,
      autoUpdaterStub,
      mockElectron
    );
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("update", () => {
    it("should load a new browser window for updating", async () => {
      sinon.stub(updateService, "shouldUpdate").returns(false);

      await updateService.update();

      sinon.assert.calledWith(mockWindowService.stubs.load, "/auto-update");
    });

    it("should resolve if there is no update available", async () => {
      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.UPDATE_NOT_AVAILABLE, sinon.match.any)
        .callsFake((_, callback) => {
          callback();
          return autoUpdaterStub;
        });

      await updateService.update();

      sinon.assert.calledWith(mockLogger.debug, "No update available");
    });

    it("should resolve if it should not update", async () => {
      sinon.stub(updateService, "shouldUpdate").returns(false);

      await updateService.update();
    });

    it("should resolve if it should update and there is an error checking", async () => {
      sinon.stub(updateService, "shouldUpdate").returns(true);
      sinon
        .stub(updateService, "checkForUpdate")
        .rejects(new Error("mock error"));

      await updateService.update();

      sinon.assert.calledWith(
        mockLogger.debug,
        "Update failed with error Error: mock error. Continuing anyway."
      );
    });
  });

  describe("shouldUpdate", () => {
    it("should update if in development and devAppUpdatePath exists", () => {
      mockFs({
        [path.join(`${__dirname}/../../../../../dev-app-update.yml`)]:
          "autoUpdater",
      });

      updateService = new UpdateService(
        mockErrorService,
        mockWindowService,
        mockLogger,
        true,
        autoUpdaterStub,
        mockElectron
      );

      expect(updateService.shouldUpdate()).to.be.true();
    });
  });

  it("should not update if in development and devAppUpdatePath is not present", async () => {
    updateService = new UpdateService(
      mockErrorService,
      mockWindowService,
      mockLogger,
      true,
      autoUpdaterStub,
      mockElectron
    );

    expect(updateService.shouldUpdate()).to.be.false();
  });

  it("should not update if the version number includes a dash", async () => {
    updateService = new UpdateService(
      mockErrorService,
      mockWindowService,
      mockLogger,
      false,
      autoUpdaterStub,
      mockElectron
    );

    versionStub.returns("1.0.0-beta");

    expect(updateService.shouldUpdate()).to.be.false();
  });

  it("should update if nothing is disabling the update", async () => {
    updateService = new UpdateService(
      mockErrorService,
      mockWindowService,
      mockLogger,
      false,
      autoUpdaterStub,
      mockElectron
    );

    versionStub.returns("1.0.0");

    expect(updateService.shouldUpdate()).to.be.true();
  });

  describe("register events", () => {
    it("should register events for update available that sends an event to the renderer", () => {
      updateService.registerEvents();

      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.UPDATE_AVAILABLE, sinon.match.any)
        .callsFake((_, callback) => {
          callback();
          return autoUpdaterStub;
        });

      const sendStub = sinon.stub();
      mockWindowService.stubs.getWebContents.returns({
        send: sendStub,
      } as unknown as Electron.WebContents);

      updateService.registerEvents();

      sinon.assert.calledWith(sendStub, UPDATE_EVENTS.UPDATE_AVAILABLE);
    });

    it("should register events for download progress and send an event to the renderer with rounded progress", () => {
      updateService.registerEvents();

      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.DOWNLOAD_PROGRESS, sinon.match.any)
        .callsFake((_, callback) => {
          callback({ percent: 17.76 });
          return autoUpdaterStub;
        });

      const sendStub = sinon.stub();
      mockWindowService.stubs.getWebContents.returns({
        send: sendStub,
      } as unknown as Electron.WebContents);

      updateService.registerEvents();

      sinon.assert.calledWith(sendStub, UPDATE_EVENTS.DOWNLOAD_PROGRESS, 17);
    });

    it("should send an event when the update has downloaded that quits and installs", async () => {
      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.UPDATE_DOWNLOADED, sinon.match.any)
        .callsFake((_, callback) => {
          callback();
          return autoUpdaterStub;
        });

      updateService.registerEvents();

      sinon.assert.called(autoUpdaterStub.stubs.quitAndInstall);
    });

    it("should log an error if the autoupdater has an error", async () => {
      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.ERROR, sinon.match.any)
        .callsFake((_, callback) => {
          callback(new Error("mock error"));
          return autoUpdaterStub;
        });

      updateService.registerEvents();

      sinon.assert.calledWith(
        mockErrorService.stubs.handleError,
        "Error checking for update",
        "Cannot check for update. An unknown error has occurred. Please try relaunching the launcher."
      );
    });

    it("should throw an err if the message contains net::ERR_NAME_NOT_RESOLVED", async () => {
      autoUpdaterStub.stubs.on
        .withArgs(UPDATE_EVENTS.ERROR, sinon.match.any)
        .callsFake((_, callback) => {
          callback(new Error("net::ERR_NAME_NOT_RESOLVED"));
          return autoUpdaterStub;
        });

      updateService.registerEvents();

      sinon.assert.calledWith(
        mockErrorService.stubs.handleError,
        "Error checking for update",
        "Cannot check for update. This likely means you are not connected to the internet. It is recommended you use the latest launcher version as it might contain bug fixes for the modpack itself."
      );
    });
  });

  describe("checkForUpdate", () => {
    it("should register events and check for an update", async () => {
      const registerEventsStub = sinon.stub(updateService, "registerEvents");

      await updateService.checkForUpdate();

      sinon.assert.called(registerEventsStub);
      sinon.assert.called(autoUpdaterStub.stubs.checkForUpdates);
    });
  });
});
