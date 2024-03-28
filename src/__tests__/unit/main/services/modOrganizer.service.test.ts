import { ModOrganizerService } from "@/main/services/modOrganizer.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { EnbService } from "@/main/services/enb.service";
import { ErrorService } from "@/main/services/error.service";
import { ConfigService, UserPreferences } from "@/main/services/config.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { GameService } from "@/main/services/game.service";
import { ProfileService } from "@/main/services/profile.service";
import { SystemService } from "@/main/services/system.service";
import { GraphicsService } from "@/main/services/graphics.service";
import mockFs from "mock-fs";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { MO2_NAMES } from "@/shared/enums/mo2";
import type psList from "ps-list";
import type { ProcessDescriptor } from "ps-list";
import type { NonEmptyArray } from "@/shared/types/non-empty-array";
import { getMockDialog } from "@/__tests__/unit/helpers/mocks/dialog.mock";
import type { Dialog } from "@/main/services/dialog.service";
import os from "os";
import fs from "fs/promises";
import Store from "electron-store";
import { getChildProcessMock } from "@/__tests__/unit/helpers/mocks/child-process.mock";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import type { ElectronLog } from "electron-log";
import type { ChildProcess } from "@/main/bindings/child-process.binding";

describe("ModOrganizer service #main #service", () => {
  let mockEnbService: StubbedInstanceWithSinonAccessor<EnbService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockResolutionService: StubbedInstanceWithSinonAccessor<ResolutionService>;
  let mockGameService: StubbedInstanceWithSinonAccessor<GameService>;
  let mockProfileService: StubbedInstanceWithSinonAccessor<ProfileService>;
  let mockSystemService: StubbedInstanceWithSinonAccessor<SystemService>;
  let mockGraphicsService: StubbedInstanceWithSinonAccessor<GraphicsService>;
  let mockPsList: sinon.SinonStub<
    Parameters<typeof psList>,
    ReturnType<typeof psList>
  >;
  let mockDialog: StubbedInstanceWithSinonAccessor<Dialog>;
  let mockChildProcess: StubbedInstanceWithSinonAccessor<ChildProcess>;
  let modOrganizerService: ModOrganizerService;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;

  beforeEach(() => {
    mockEnbService = createStubInstance(EnbService);
    mockErrorService = createStubInstance(ErrorService);
    mockConfigService = createStubInstance(ConfigService);
    mockResolutionService = createStubInstance(ResolutionService);
    mockGameService = createStubInstance(GameService);
    mockProfileService = createStubInstance(ProfileService);
    mockSystemService = createStubInstance(SystemService);
    mockGraphicsService = createStubInstance(GraphicsService);

    mockPsList = sinon.stub();
    mockChildProcess = getChildProcessMock();

    mockDialog = getMockDialog();
    mockLogger = getMockLogger();

    modOrganizerService = new ModOrganizerService(
      mockEnbService,
      mockErrorService,
      mockConfigService,
      mockResolutionService,
      mockGameService,
      mockProfileService,
      mockSystemService,
      mockGraphicsService,
      mockDialog,
      mockPsList,
      mockChildProcess,
      mockLogger,
      true
    );
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("isRunning", () => {
    it("should determine if Mod Organizer is running", async () => {
      mockSystemService.stubs.isProcessRunning
        .withArgs(MO2_NAMES.MO2EXE)
        .resolves(true);

      expect(await modOrganizerService.isRunning()).to.eql(true);
    });
  });

  describe("getFirstCustomExecutableTitle", () => {
    it("should get the first binary from MO2 settings", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[customExecutables]",
            "size=1",
            "1\\binary=mock/first/custom/executable.exe",
            "1\\title=SKSE",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      expect(await modOrganizerService.getFirstCustomExecutableTitle()).to.eql(
        "SKSE"
      );
    });
  });

  describe("closeMO2", () => {
    it("should close MO2 if it it running", async () => {
      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        {
          name: MO2_NAMES.MO2EXE,
          pid: 123,
          ppid: 0,
        },
        {
          name: "mockProcess.exe",
          pid: 456,
          ppid: 0,
        },
      ];

      const killStub = sinon.stub(process, "kill");

      mockPsList.resolves(mockProcesses);
      await modOrganizerService.closeMO2();

      sinon.assert.calledWith(killStub, mockProcesses[0].pid);
    });

    it("should not try to kill anything if MO2 is not running", async () => {
      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        {
          name: "mockProcess.exe",
          pid: 456,
          ppid: 0,
        },
      ];

      const killStub = sinon.stub(process, "kill");

      mockPsList.resolves(mockProcesses);
      await modOrganizerService.closeMO2();

      sinon.assert.notCalled(killStub);
    });
  });

  describe("handleMO2Running", () => {
    it("should show a message to the user", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 0,
        checkboxChecked: false,
      });

      await modOrganizerService.handleMO2Running();

      sinon.assert.called(mockDialog.stubs.showMessageBox);
    });

    it("should close MO2 if instructed to", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 1,
        checkboxChecked: false,
      });

      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        {
          name: MO2_NAMES.MO2EXE,
          pid: 123,
          ppid: 0,
        },
        {
          name: "mockProcess.exe",
          pid: 456,
          ppid: 0,
        },
      ];

      const killStub = sinon.stub(process, "kill");

      mockPsList.resolves(mockProcesses);

      await modOrganizerService.handleMO2Running();

      sinon.assert.called(killStub);
    });

    it("should return false if not closing MO2", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 0,
        checkboxChecked: false,
      });

      expect(await modOrganizerService.handleMO2Running()).to.eql(false);
    });
  });

  describe("readSettings", () => {
    it("should read the settings file and parse it", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[customExecutables]",
            "size=1",
            "1\\binary=mock/first/custom/executable.exe",
            "1\\title=SKSE",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      expect(await modOrganizerService.readSettings()).to.containDeep({
        customExecutables: {
          size: 1,
          "1\\binary": "mock/first/custom/executable.exe",
          "1\\title": "SKSE",
        },
      });
    });
  });

  describe("updateSelectedProfile", () => {
    it("should update the selected profile", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[General]",
            "gameName=Skyrim Special Edition",
            "selected_profile=@ByteArray(mock-original-profile-name)",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      await modOrganizerService.updateSelectedProfile("new-profile-name");

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[General]",
          "gameName=Skyrim Special Edition",
          "selected_profile=@ByteArray(new-profile-name)",
        ].join(os.EOL)
      );
    });
  });

  describe("preventMO2GUIFromShowing", () => {
    it("should set lock_gui to to false in the ini", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: ["[Settings]", "lock_gui=true"].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      await modOrganizerService.preventMO2GUIFromShowing();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[Settings]",
          "lock_gui=false",
        ].join(os.EOL)
      );
    });
  });

  describe("restoreMO2Settings", () => {
    it("should restore the MO2 settings if they are available", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: ["[Settings]", "lock_gui=true"].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      // This stores the previous MO2 settings to be restored later
      await modOrganizerService.preventMO2GUIFromShowing();

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[Mock settings]",
            "another-setting=true",
          ].join(os.EOL),
        },
      });

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(["[Mock settings]", "another-setting=true"].join(os.EOL));

      await modOrganizerService.restoreMO2Settings();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[Settings]",
          "lock_gui=true",
        ].join(os.EOL)
      );
    });

    it("should not restore MO2 settings if there is none available", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[Mock settings]",
            "another-setting=true",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      await modOrganizerService.restoreMO2Settings();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(["[Mock settings]", "another-setting=true"].join(os.EOL));
    });
  });

  describe("prepareForLaunch", () => {
    beforeEach(() => {
      mockSystemService.stubs.isProcessRunning
        .withArgs(MO2_NAMES.MO2EXE)
        .resolves(true);

      mockDialog.stubs.showMessageBox.resolves({
        response: 1,
        checkboxChecked: false,
      });

      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        { name: "mock", pid: 123, ppid: 0 },
      ];
      sinon.stub(process, "kill");
      mockPsList.resolves(mockProcesses);

      const mockStore = createStubInstance<Store<UserPreferences>>(Store);
      sinon.stub(mockStore.stubs, "store").get(() => "mock");
      mockConfigService.stubs.getPreferences.returns(mockStore);
    });

    it("should not continue if MO2 is running and return false if user chooses not to close MO2", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 0,
        checkboxChecked: false,
      });

      expect(await modOrganizerService.prepareForLaunch()).to.eql(false);
    });

    it("should continue running and return true if MO2 is running and the user chooses to close it", async () => {
      expect(await modOrganizerService.prepareForLaunch()).to.eql(true);
    });

    it("should not try to close MO2 if it is not running", async () => {
      mockSystemService.stubs.isProcessRunning
        .withArgs(MO2_NAMES.MO2EXE)
        .resolves(false);

      await modOrganizerService.prepareForLaunch();

      sinon.assert.notCalled(mockDialog.stubs.showMessageBox);
    });

    it("should set the resolution", async () => {
      await modOrganizerService.prepareForLaunch();

      sinon.assert.called(
        mockResolutionService.stubs.setResolutionInGraphicsSettings
      );
    });
  });

  describe("launchMO2", () => {
    const mockModDirectory = "mock/mod/directory";

    beforeEach(() => {
      mockSystemService.stubs.isProcessRunning
        .withArgs(MO2_NAMES.MO2EXE)
        .resolves(true);

      mockDialog.stubs.showMessageBox.resolves({
        response: 1,
        checkboxChecked: false,
      });

      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        { name: "mock", pid: 123, ppid: 0 },
      ];
      sinon.stub(process, "kill");
      mockPsList.resolves(mockProcesses);

      const mockStore = createStubInstance<Store<UserPreferences>>(Store);
      sinon.stub(mockStore.stubs, "store").get(() => "mock");
      mockConfigService.stubs.getPreferences.returns(mockStore);

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(mockModDirectory);

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[General]",
            "gameName=Skyrim Special Edition",
            "selected_profile=@ByteArray(mock-original-profile-name)",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);
    });

    it("should not continue if the preparation fails", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 0,
        checkboxChecked: false,
      });

      await modOrganizerService.launchMO2();

      sinon.assert.notCalled(mockChildProcess.stubs.exec);
    });

    it("should launch MO2", async () => {
      mockChildProcess.stubs.exec.resolves({});

      await modOrganizerService.launchMO2();

      sinon.assert.calledWith(
        mockChildProcess.stubs.exec,
        `"${mockModDirectory}/${MO2_NAMES.MO2EXE}"`
      );
    });

    it("should update the profile before launching", async () => {
      mockChildProcess.stubs.exec.resolves({});

      mockProfileService.stubs.getProfilePreference.resolves("mock-new-name");

      await modOrganizerService.launchMO2();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          "",
          "[General]",
          "gameName=Skyrim Special Edition",
          "selected_profile=@ByteArray(mock-new-name)",
        ].join(os.EOL)
      );
    });

    it("should just log the error if there is any stderr from MO2", async () => {
      mockChildProcess.stubs.exec.resolves({
        stderr: "mock error",
      });

      await modOrganizerService.launchMO2();

      sinon.assert.calledWithMatch(mockLogger.error, sinon.match("mock error"));
    });

    it("should throw an error if anything fails", async () => {
      mockChildProcess.stubs.exec.rejects(new Error("mock error"));

      await expect(modOrganizerService.launchMO2()).to.be.rejectedWith(
        "mock error"
      );
    });

    it("should not log stdout if not in development mode", async () => {
      mockChildProcess.stubs.exec.resolves({});

      modOrganizerService = new ModOrganizerService(
        mockEnbService,
        mockErrorService,
        mockConfigService,
        mockResolutionService,
        mockGameService,
        mockProfileService,
        mockSystemService,
        mockGraphicsService,
        mockDialog,
        mockPsList,
        mockChildProcess,
        mockLogger,
        false
      );

      await modOrganizerService.launchMO2();

      const debugWithStdOut =
        (mockLogger.debug.args as string[][]).filter((arg) =>
          arg?.[0]?.includes("stdout")
        ).length > 0;

      expect(debugWithStdOut).to.equal(false);
    });
  });

  describe("launchGame", () => {
    const mockModDirectory = "mock/mod/directory";

    beforeEach(() => {
      mockSystemService.stubs.isProcessRunning
        .withArgs(MO2_NAMES.MO2EXE)
        .resolves(true);

      mockDialog.stubs.showMessageBox.resolves({
        response: 1,
        checkboxChecked: false,
      });

      const mockProcesses: NonEmptyArray<ProcessDescriptor> = [
        { name: "mock", pid: 123, ppid: 0 },
      ];
      sinon.stub(process, "kill");
      mockPsList.resolves(mockProcesses);

      const mockStore = createStubInstance<Store<UserPreferences>>(Store);
      sinon.stub(mockStore.stubs, "store").get(() => "mock");
      mockConfigService.stubs.getPreferences.returns(mockStore);

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(mockModDirectory);

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: [
            "[customExecutables]",
            "size=1",
            "1\\binary=mock/first/custom/executable.exe",
            "1\\title=SKSE",
            "[Settings]",
            "lock_gui=true",
          ].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      mockProfileService.stubs.getProfilePreference.resolves("mock-profile");

      mockChildProcess.stubs.exec.resolves({});
    });

    it("should not continue the launch if the user chooses not to close MO2", async () => {
      mockDialog.stubs.showMessageBox.resolves({
        response: 0,
        checkboxChecked: false,
      });

      await modOrganizerService.launchGame();

      sinon.assert.notCalled(mockChildProcess.stubs.exec);
    });

    it("should prevent the MO2 GUI from showing", async () => {
      const writeFileSpy = sinon.spy(fs, "writeFile");

      await modOrganizerService.launchGame();

      sinon.assert.calledWith(
        writeFileSpy,
        `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[customExecutables]",
          "size=1",
          "1\\binary=mock/first/custom/executable.exe",
          "1\\title=SKSE",
          "",
          "[Settings]",
          "lock_gui=false",
        ].join(os.EOL)
      );
    });

    it("should call MO2 with the command to start the game with the right profile", async () => {
      await modOrganizerService.launchGame();

      sinon.assert.calledWith(
        mockChildProcess.stubs.exec,
        `"${mockModDirectory}/${MO2_NAMES.MO2EXE}" -p "mock-profile" "moshortcut://:SKSE"`
      );
    });

    it("should copy the skyrim launch logs", async () => {
      await modOrganizerService.launchGame();

      sinon.assert.called(mockGameService.stubs.copySkyrimLaunchLogs);
    });

    it("should restore the MO2 settings", async () => {
      await modOrganizerService.launchGame();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[customExecutables]",
          "size=1",
          "1\\binary=mock/first/custom/executable.exe",
          "1\\title=SKSE",
          "",
          "[Settings]",
          "lock_gui=true",
        ].join(os.EOL)
      );
    });

    it("should sync the enb settings from the game to presets", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("mock-enb-profile");

      await modOrganizerService.launchGame();

      sinon.assert.calledWith(
        mockEnbService.stubs.syncEnbFromGameToPresets,
        "mock-enb-profile"
      );
    });

    it("should sync the graphics from the game to the presets", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.GRAPHICS)
        .returns("mock-graphics-profile");
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.PRESET)
        .returns("mock-preset");

      await modOrganizerService.launchGame();

      sinon.assert.calledWith(
        mockGraphicsService.stubs.syncGraphicsFromGameToPresets,
        "mock-graphics-profile",
        "mock-preset"
      );
    });

    it("should throw an error if MO2 returns any stderr", async () => {
      mockChildProcess.stubs.exec.resolves({
        stdout: "",
        stderr: new Error("mock error"),
      });

      await expect(modOrganizerService.launchGame()).to.be.rejectedWith(
        "Error: mock error"
      );
    });

    it("should throw an error if exec throws an error", async () => {
      mockChildProcess.stubs.exec.rejects(new Error("mock exec error"));

      await expect(modOrganizerService.launchGame()).to.be.rejectedWith(
        "mock exec error"
      );
    });

    it("should not log stdout if not in development mode", async () => {
      modOrganizerService = new ModOrganizerService(
        mockEnbService,
        mockErrorService,
        mockConfigService,
        mockResolutionService,
        mockGameService,
        mockProfileService,
        mockSystemService,
        mockGraphicsService,
        mockDialog,
        mockPsList,
        mockChildProcess,
        mockLogger,
        false
      );

      await modOrganizerService.launchGame();

      const debugWithStdOut =
        (mockLogger.debug.args as string[][]).filter((arg) =>
          arg?.[0]?.includes("stdout")
        ).length > 0;

      expect(debugWithStdOut).to.equal(false);
    });
  });

  describe("postLaunch", () => {
    it("should copy the skyrim launch logs", async () => {
      await modOrganizerService.postLaunch();

      sinon.assert.called(mockGameService.stubs.copySkyrimLaunchLogs);
    });

    it("should restore the MO2 settings", async () => {
      const mockModDirectory = "mock/mod/directory";

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: ["[Settings]"].join(os.EOL),
        },
      });

      mockConfigService.stubs.modDirectory.returns(mockModDirectory);

      // This stores the previous MO2 settings to be restored later
      await modOrganizerService.preventMO2GUIFromShowing();

      mockFs({
        [mockModDirectory]: {
          [MO2_NAMES.MO2Settings]: ["[Mock settings]"].join(os.EOL),
        },
      });

      await modOrganizerService.postLaunch();

      expect(
        await fs.readFile(
          `${mockModDirectory}/${MO2_NAMES.MO2Settings}`,
          "utf8"
        )
      ).to.equal(
        [
          // The library used to parse and stringify inis adds a newline at the start of the file
          "",
          "[Settings]",
        ].join(os.EOL)
      );
    });

    it("should sync the enb settings from the game to presets", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("mock-enb-profile");

      await modOrganizerService.postLaunch();

      sinon.assert.calledWith(
        mockEnbService.stubs.syncEnbFromGameToPresets,
        "mock-enb-profile"
      );
    });

    it("should sync the graphics from the game to the presets", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.GRAPHICS)
        .returns("mock-graphics-profile");
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.PRESET)
        .returns("mock-preset");

      await modOrganizerService.postLaunch();

      sinon.assert.calledWith(
        mockGraphicsService.stubs.syncGraphicsFromGameToPresets,
        "mock-graphics-profile",
        "mock-preset"
      );
    });
  });
});
