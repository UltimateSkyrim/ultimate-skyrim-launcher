import { ConfigService, UserPreferences } from "@/main/services/config.service";
import { expect } from "@loopback/testlab";
import mockFs from "mock-fs";
import Store from "electron-store";
import sinon from "sinon";
import log, { ElectronLog } from "electron-log";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";

describe("Config service #main #service", () => {
  let mockStore: Store<UserPreferences>;
  let mockModDirectory: string;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;
  let configService: ConfigService;
  let originalEnv: NodeJS.ProcessEnv;

  let mockUserConfig: string;
  let preferenceFile: string;

  beforeEach(() => {
    originalEnv = Object.assign({}, process.env);

    mockUserConfig = "/mock/config";
    preferenceFile = "userPreferences";
    mockModDirectory = "mock/mod/directory";
    mockFs({
      [`${mockUserConfig}/${preferenceFile}.json`]: JSON.stringify({
        MOD_DIRECTORY: mockModDirectory,
      }),
      [mockModDirectory]: {
        "Stock Game": {},
        launcher: {
          _backups: {},
        },
      },
    });

    mockStore = new Store<UserPreferences>({
      name: preferenceFile,
      cwd: mockUserConfig,
    });

    mockLogger = sinon.stub(log);
    sinon.stub(mockLogger.transports.file, "getFile").returns({
      path: "mock/log/file",
      bytesWritten: 0,
      clear: sinon.stub(),
      size: 0,
      on: sinon.stub(),
    });

    configService = new ConfigService(mockLogger, mockStore);
  });

  afterEach(() => {
    process.env = Object.assign({}, originalEnv);

    sinon.restore();
    mockFs.restore();
  });

  it("should get the skyrim directory", () => {
    expect(configService.skyrimDirectory()).to.eql(
      `${mockModDirectory}/Stock Game`
    );
  });

  it("should get the log directory", () => {
    expect(configService.getLogDirectory()).to.eql("mock/log");
  });

  it("should get the mod directory", () => {
    expect(configService.modDirectory()).to.eql("mock/mod/directory");
  });

  it("should return the modlist launcher directory", () => {
    expect(configService.launcherDirectory()).to.eql(
      `${mockModDirectory}/launcher`
    );
  });

  it("should return the backup directory", () => {
    expect(configService.backupDirectory()).to.eql(
      `${mockModDirectory}/launcher/_backups`
    );
  });

  it("should return true if backups exist", () => {
    expect(configService.backupsExist()).to.eql(true);
  });

  it("should return false if backups do not exist", () => {
    mockFs({
      [mockModDirectory]: {
        "Stock Game": {},
        launcher: {},
      },
    });
    expect(configService.backupsExist()).to.eql(false);
  });

  it("should return the preference", () => {
    expect(
      configService.getPreference(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
    ).to.eql(mockModDirectory);
  });

  it("should return true if the preference exists", () => {
    expect(
      configService.hasPreference(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
    ).to.eql(true);
  });

  it("should return false if the preference does not exist", () => {
    expect(configService.hasPreference(USER_PREFERENCE_KEYS.GRAPHICS)).to.eql(
      false
    );
  });

  it("should delete the preference", () => {
    configService.deletePreference(USER_PREFERENCE_KEYS.MOD_DIRECTORY);
    expect(mockStore.get(USER_PREFERENCE_KEYS.MOD_DIRECTORY)).to.eql(undefined);
  });

  it("should set the preference", () => {
    configService.setPreference(
      USER_PREFERENCE_KEYS.MOD_DIRECTORY,
      "new/mod/directory"
    );
    expect(mockStore.get(USER_PREFERENCE_KEYS.MOD_DIRECTORY)).to.eql(
      "new/mod/directory"
    );
  });

  it("should set the preference if the value is an object", () => {
    configService.setPreference(USER_PREFERENCE_KEYS.GRAPHICS, {
      mock: "value",
    });
    expect(mockStore.get(USER_PREFERENCE_KEYS.GRAPHICS)).to.eql({
      mock: "value",
    });
  });

  describe("Set default preferences", () => {
    it("should set the default preference if the key doesn't exist", async () => {
      await configService.setDefaultPreferences({
        [USER_PREFERENCE_KEYS.GRAPHICS]: {
          value: "high",
        },
      });
      expect(mockStore.get(USER_PREFERENCE_KEYS.GRAPHICS)).to.eql("high");
    });

    it("should not set the default preference if it exists", async () => {
      mockStore.set(USER_PREFERENCE_KEYS.MOD_DIRECTORY, "old/mod/directory");
      await configService.setDefaultPreferences({
        [USER_PREFERENCE_KEYS.MOD_DIRECTORY]: {
          value: "new/mod/directory",
        },
      });
      expect(mockStore.get(USER_PREFERENCE_KEYS.MOD_DIRECTORY)).to.eql(
        "old/mod/directory"
      );
    });

    it("should set the preference if the current value is not valid", async () => {
      await configService.setDefaultPreferences({
        [USER_PREFERENCE_KEYS.GRAPHICS]: {
          value: "mockValue",
          validate: async () => false,
        },
      });
      expect(mockStore.get(USER_PREFERENCE_KEYS.GRAPHICS)).to.eql("mockValue");
    });

    it("should not set the value if it is already present and valid", async () => {
      mockStore.set(USER_PREFERENCE_KEYS.RESOLUTION, "high");
      await configService.setDefaultPreferences({
        [USER_PREFERENCE_KEYS.RESOLUTION]: {
          value: "low",
          validate: async () => true,
        },
      });
      expect(mockStore.get(USER_PREFERENCE_KEYS.RESOLUTION)).to.eql("high");
    });

    it("should set the preference if the value is valid", async () => {
      mockFs({
        [`${mockUserConfig}/${preferenceFile}.json`]: JSON.stringify({}),
        [mockModDirectory]: {
          "Stock Game": {},
          launcher: {
            _backups: {},
          },
        },
      });

      await configService.setDefaultPreferences({
        [USER_PREFERENCE_KEYS.RESOLUTION]: {
          value: "high",
          validate: async () => true,
        },
      });
      expect(mockStore.get(USER_PREFERENCE_KEYS.RESOLUTION)).to.eql("high");
    });
  });

  it("should get the preferences", async () => {
    expect(configService.getPreferences()).to.eql(mockStore);
  });

  it("should open the preferences in an editor", () => {
    const mockEditor = sinon.stub(mockStore, "openInEditor");
    configService.editPreferences();
    expect(mockEditor.calledOnce).to.eql(true);
  });

  describe("getNewUserPreferencesStore", () => {
    it("should return a Store instance with custom 'cwd' when CONFIG_PATH is set", () => {
      process.env["CONFIG_PATH"] = "/mock/custom/config/path";
      mockFs({
        "/mock/custom/config/path": {},
      });

      const store = ConfigService.getNewUserPreferencesStore();
      expect(store).to.be.instanceOf(Store);
      expect(store.path).to.equal(
        "/mock/custom/config/path/userPreferences.json"
      );
    });
  });
});
