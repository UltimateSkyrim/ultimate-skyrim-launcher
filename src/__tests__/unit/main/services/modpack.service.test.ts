import type { StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import { ModpackService } from "@/main/services/modpack.service";
import { createStubInstance, expect, sinon } from "@loopback/testlab";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { ConfigService, UserPreferences } from "@/main/services/config.service";
import { MO2_NAMES } from "@/shared/enums/mo2";
import mockFs from "mock-fs";
import Store from "electron-store";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";

describe("Modpack service #main #service", () => {
  let modpackService: ModpackService;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;

  const mockModpackPath = "mock/modpack/path";

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    modpackService = new ModpackService(mockConfigService, getMockLogger());
  });

  describe("checkModpackPathIsValid", () => {
    it(`should return ok if the directory contains ${MO2_NAMES.MO2EXE}, profiles and launcher`, async () => {
      mockFs({
        [mockModpackPath]: {
          [MO2_NAMES.MO2EXE]: "",
          profiles: {},
          launcher: {},
        },
      });

      expect(
        modpackService.checkModpackPathIsValid(mockModpackPath)
      ).to.deepEqual({
        ok: true,
        missingPaths: [],
      });
    });

    it("should return okay false if one of the requires paths is missing", async () => {
      mockFs({
        [mockModpackPath]: {
          launcher: {},
        },
      });

      expect(
        modpackService.checkModpackPathIsValid(mockModpackPath)
      ).to.deepEqual({
        ok: false,
        missingPaths: [MO2_NAMES.MO2EXE, "profiles"],
      });
    });
  });

  describe("checkCurrentModpackPathIsValid", () => {
    it("should check the modpack is set and is valid", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(mockModpackPath);

      const mockUserConfig = "/mock/config";
      const preferenceFile = "userPreferences";
      mockFs({
        [`${mockUserConfig}/${preferenceFile}.json`]: JSON.stringify({
          MOD_DIRECTORY: mockModpackPath,
        }),
        [mockModpackPath]: {
          [MO2_NAMES.MO2EXE]: "",
          profiles: {},
          launcher: {},
        },
      });

      const mockStore = new Store<UserPreferences>({
        name: preferenceFile,
        cwd: mockUserConfig,
      });

      mockConfigService.stubs.getPreferences.returns(mockStore);

      expect(modpackService.checkCurrentModpackPathIsValid()).to.equal(true);
    });
  });

  describe("getModpackDirectory", () => {
    it("should get the modpack preference", async () => {
      const mockModDirectory = "mock/mod/directory";
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(mockModDirectory);

      expect(modpackService.getModpackDirectory()).to.equal(mockModDirectory);
    });
  });

  // TODO this should probably be configurable outside of the app
  describe("getModpackMetadata", () => {
    it("should get the modpack metadata", async () => {
      expect(modpackService.getModpackMetadata()).to.deepEqual({
        name: "Wildlander",
        logo: "/images/logos/wildlander-full-light.svg",
        backgroundImage: "/images/default-background.png",
        website: "https://www.wildlandermod.com",
        wiki: "https://wiki.wildlandermod.com/",
        patreon: "https://www.patreon.com/dylanbperry",
        roadmap: "https://airtable.com/shrvAxHcCeCqKfnGe",
      });
    });
  });

  describe("deleteModpackDirectory", () => {
    it("should delete the modpack directory", async () => {
      modpackService.deleteModpackDirectory();

      sinon.assert.calledWith(
        mockConfigService.stubs.deletePreference,
        USER_PREFERENCE_KEYS.MOD_DIRECTORY
      );
    });
  });

  describe("isModpackSet", () => {
    it("should return true if the modpack is set", async () => {
      const mockUserConfig = "/mock/config";
      const preferenceFile = "userPreferences";
      mockFs({
        [`${mockUserConfig}/${preferenceFile}.json`]: JSON.stringify({
          MOD_DIRECTORY: mockModpackPath,
        }),
      });

      const mockStore = new Store<UserPreferences>({
        name: preferenceFile,
        cwd: mockUserConfig,
      });

      mockConfigService.stubs.getPreferences.returns(mockStore);

      expect(modpackService.isModpackSet()).to.be.true();
    });

    it("should return false if the modpack is not set", async () => {
      const mockUserConfig = "/mock/config";
      const preferenceFile = "userPreferences";
      mockFs({
        [`${mockUserConfig}/${preferenceFile}.json`]: JSON.stringify({}),
      });

      const mockStore = new Store<UserPreferences>({
        name: preferenceFile,
        cwd: mockUserConfig,
      });

      mockConfigService.stubs.getPreferences.returns(mockStore);

      expect(modpackService.isModpackSet()).to.be.false();
    });
  });
});
