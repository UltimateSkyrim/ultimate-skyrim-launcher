import { SystemService } from "@/main/services/system.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { ConfigService } from "@/main/services/config.service";
import { ErrorService } from "@/main/services/error.service";
import type psList from "ps-list";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import * as shutDownCommands from "electron-shutdown-command";
import type { ElectronLog, LogFile } from "electron-log";
import fs, { promises as fsPromises } from "fs";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import fetchInstalledSoftware from "fetch-installed-software";
import stream from "stream/promises";
import nock from "nock";
import type child_process from "child_process";
import { getChildProcessMock } from "@/__tests__/unit/helpers/mocks/child-process.mock";
import { afterEach } from "mocha";

describe("System service #main #service", () => {
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;

  let shellStub: sinon.SinonStub;
  let systemService: SystemService;
  let mockChildProcess: StubbedInstanceWithSinonAccessor<typeof child_process>;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    mockErrorService = createStubInstance(ErrorService);

    shellStub = sinon.stub();
    mockLogger = getMockLogger();

    const mockListProcess = () =>
      new Promise<psList.ProcessDescriptor[]>((resolve) =>
        resolve([{ name: "mockname.exe", pid: 1234, ppid: 1234 }])
      );

    mockChildProcess = getChildProcessMock();

    systemService = new SystemService(
      mockConfigService,
      mockErrorService,
      mockLogger,
      {
        app: { getPath: () => "/mock/path" },
        shell: { openPath: shellStub },
      } as unknown as typeof Electron,
      mockChildProcess,
      mockListProcess
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("getLocalAppData", () => {
    it("should return the path to the local app data", async () => {
      process.env["APPDATA"] = "/mockappdata/test";
      expect(SystemService.getLocalAppData()).to.equal("/mockappdata/local");
    });
  });

  describe("getCPlusPlusInstallerFile", () => {
    it("should get the path to the file", async () => {
      expect(systemService.getCPlusPlusInstallerFile()).to.equal(
        "/mock/path/vc_redist.x64.exe"
      );
    });
  });

  describe("reboot", () => {
    it("should reboot the system", async () => {
      const rebootStub = sinon.stub(shutDownCommands, "reboot");

      systemService.reboot();

      sinon.assert.calledOnce(rebootStub);
    });
  });

  describe("openApplicationLogs", () => {
    it("should open the application logs", async () => {
      sinon.stub(mockLogger.transports.file, "getFile").returns({
        path: "/mock/path/to/logfile.txt",
      } as unknown as LogFile);

      await systemService.openApplicationLogsPath();

      sinon.assert.calledWith(shellStub, "/mock/path/to");
    });
    it("should log an error if the path cannot be opened", async () => {
      sinon.stub(mockLogger.transports.file, "getFile").returns({
        path: "/mock/path/to/logfile.txt",
      } as unknown as LogFile);

      shellStub.returns("mock error");

      await systemService.openApplicationLogsPath();

      sinon.assert.calledWith(mockLogger.error, "mock error");
    });
  });

  describe("openCrashLogs", () => {
    it("should open the log if it exists", async () => {
      mockConfigService.stubs.modDirectory.returns("/mock/path/to/mods");
      sinon.stub(fs, "existsSync").returns(true);

      await systemService.openCrashLogs();

      sinon.assert.calledWith(
        shellStub,
        "/mock/path/to/mods/overwrite/NetScriptFramework/Crash"
      );
    });

    it("should log an error if the path cannot be opened", async () => {
      mockConfigService.stubs.modDirectory.returns("/mock/path/to/mods");
      sinon.stub(fs, "existsSync").returns(true);
      shellStub.returns("mock error");

      await systemService.openCrashLogs();

      sinon.assert.calledWith(mockLogger.error, "mock error");
    });

    it("should throw an error if the log doesn't exist", async () => {
      mockConfigService.stubs.modDirectory.returns("/mock/path/to/mods");
      sinon.stub(fs, "existsSync").returns(false);

      await systemService.openCrashLogs();

      sinon.assert.calledWith(
        mockErrorService.stubs.handleError,
        "Error while opening crash logs folder"
      );
    });
  });

  describe("isProcessRunning", () => {
    it("should return true if a process is running", async () => {
      expect(await systemService.isProcessRunning("mockname.exe")).to.eql(true);
    });

    it("should return false if a process is not running", async () => {
      expect(await systemService.isProcessRunning("notrunning.exe")).to.eql(
        false
      );
    });
  });

  describe("clearApplicationLogs", () => {
    let writeStub: sinon.SinonStub;

    beforeEach(() => {
      writeStub = sinon.stub(fsPromises, "writeFile");
    });

    it("should clear the application logs", async () => {
      sinon.stub(mockLogger.transports.file, "getFile").returns({
        clear: sinon.stub(),
        path: "\\mock\\path\\to\\logfile.txt",
      } as unknown as LogFile);
    });

    it("should clear the renderer logs if they exist", async () => {
      const clearStub = sinon.stub();
      sinon.stub(mockLogger.transports.file, "getFile").returns({
        clear: clearStub,
        path: "/mock/path/to/logfile.txt",
      } as unknown as LogFile);

      sinon.stub(fs, "existsSync").returns(true);

      await systemService.clearApplicationLogs();

      sinon.assert.calledWith(writeStub, "/mock/path/to/renderer.log", "", {
        flag: "w",
      });
    });

    it("should not clear the renderer logs if they do not exist", async () => {
      const clearStub = sinon.stub();
      sinon.stub(mockLogger.transports.file, "getFile").returns({
        clear: clearStub,
        path: "/mock/path/to/main.log",
      } as unknown as LogFile);

      sinon.stub(fs, "existsSync").returns(false);

      await systemService.clearApplicationLogs();

      sinon.assert.notCalled(writeStub);
    });
  });

  describe("checkPrerequisitesInstalled", () => {
    it("should return true if the user has disabled the check", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.CHECK_PREREQUISITES)
        .returns(false);

      expect(await systemService.checkPrerequisitesInstalled()).to.eql(true);
    });

    it("should return false if C++ is not detected", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.CHECK_PREREQUISITES)
        .returns(true);

      sinon
        .stub(fetchInstalledSoftware, "getAllInstalledSoftware")
        .resolves([
          { DisplayName: "Mock software", RegistryDirName: "Mock software" },
        ]);

      expect(await systemService.checkPrerequisitesInstalled()).to.eql(false);
    });

    it("should throw an error if the installed version is not 2019", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.CHECK_PREREQUISITES)
        .returns(true);

      sinon.stub(fetchInstalledSoftware, "getAllInstalledSoftware").resolves([
        {
          DisplayName: "Microsoft Visual C++ 2017 Redistributable (x64)",
          RegistryDirName: "Mock software",
        },
      ]);

      expect(await systemService.checkPrerequisitesInstalled()).to.eql(false);
    });
  });

  describe("installPrerequisites", () => {
    it("should download and install the prerequisites", async () => {
      const downloadStub = sinon.stub(systemService, "downloadPrerequisites");
      sinon
        .stub(systemService, "getCPlusPlusInstallerFile")
        .returns("/mock/path/test.exe");

      await systemService.installPrerequisites();

      sinon.assert.calledOnce(downloadStub);
      sinon.assert.calledWith(
        mockChildProcess.stubs.exec,
        `"/mock/path/test.exe"`
      );
    });
  });

  describe("downloadPrerequisites", () => {
    it("should download the prerequisites", async () => {
      const downloadStub = sinon.stub(systemService, "downloadFile");
      await systemService.downloadPrerequisites();

      sinon.assert.calledWith(
        downloadStub,
        "https://aka.ms/vs/17/release/vc_redist.x64.exe",
        "/mock/path/vc_redist.x64.exe"
      );
    });
  });

  describe("downloadFile", () => {
    let mockFetch: nock.Scope;

    const resetNock = () => {
      nock.cleanAll();
      nock.restore();
    };

    beforeEach(() => {
      if (!nock.isActive()) {
        nock.activate();
      }

      nock.disableNetConnect();
      mockFetch = nock("https://mock.com")
        .get("/")
        .reply(200, "Mock content")
        .persist();
    });

    afterEach(() => {
      resetNock();
    });

    it("should download the file if it does not exist", async () => {
      sinon.stub(fs, "existsSync").returns(false);
      sinon.stub(fs, "createWriteStream");
      sinon.stub(stream, "pipeline").resolves();

      await systemService.downloadFile(
        "https://mock.com/",
        "/mock/path/to/file"
      );

      expect(mockFetch.isDone()).to.eql(true);
    });

    it("should not download the file if it exists", async () => {
      sinon.stub(fs, "existsSync").returns(true);

      await systemService.downloadFile(
        "https://mock.com",
        "/mock/path/to/file"
      );

      expect(mockFetch.isDone()).to.eql(false);
    });

    it("should log an error if there is no body in the download", async () => {
      sinon.stub(fs, "existsSync").returns(false);
      sinon.stub(fs, "createWriteStream");
      sinon.stub(stream, "pipeline").resolves();
      resetNock();
      nock.activate();
      nock("https://mock.com").get("/").reply(500, "Mock error");

      await expect(
        systemService.downloadFile("https://mock.com", "/mock/path/to/file")
      ).to.be.rejectedWith(
        "Failed to download file from https://mock.com with response status 500"
      );
    });
  });
});
