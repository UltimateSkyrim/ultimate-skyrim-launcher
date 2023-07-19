import { MigrationService } from "@/main/services/migration.service";
import { GraphicsService } from "@/main/services/graphics.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import mockFs from "mock-fs";
import { ProfileService } from "@/main/services/profile.service";
import fs from "fs";
import { ConfigService } from "@/main/services/config.service";
import { getMockLogger } from "@/__tests__/unit/helpers/logger.mock";

describe("Migration service", () => {
  let migrationService: MigrationService;
  let mockGraphicsService: StubbedInstanceWithSinonAccessor<GraphicsService>;
  let mockProfileService: StubbedInstanceWithSinonAccessor<ProfileService>;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;

  beforeEach(() => {
    mockGraphicsService = createStubInstance(GraphicsService);
    mockProfileService = createStubInstance(ProfileService);
    mockConfigService = createStubInstance(ConfigService);
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("Separating profile from graphics", () => {
    let mockModDirectory: string;
    let mockProfilesDirectory: string;
    let mockLauncherDirectory: string;
    let mockGraphicsPresets: string;
    let mockBackupDirectory: string;
    let mockProfileBackup: string;

    beforeEach(() => {
      mockModDirectory = "/mod/directory";
      mockLauncherDirectory = `${mockModDirectory}/launcher`;
      mockProfilesDirectory = `${mockModDirectory}/profiles`;
      mockGraphicsPresets = `${mockLauncherDirectory}/Graphics Presets`;
      mockBackupDirectory = `${mockLauncherDirectory}/backups`;
      mockProfileBackup = `${mockBackupDirectory}/profiles`;

      const mockProfiles = [
        { real: "mock-real", friendly: "mock friendly" },
        { real: "mock-real-2", friendly: "mock friendly 2" },
      ];
      mockFs({
        [mockLauncherDirectory]: {
          "namesMO2.json": JSON.stringify(mockProfiles),
        },
        [mockProfilesDirectory]: {
          potato: {
            "modlist.txt": "",
            "plugins.txt": "",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
          low: {
            "modlist.txt": "modified-modlist",
            "plugins.txt": "modified-plugins",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
          high: {
            "modlist.txt": "",
            "plugins.txt": "",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
        },
        [mockProfileBackup]: {
          potato: "potato-content",
          low: "content",
        },
        [`${mockLauncherDirectory}/backup/Graphics Presets`]: {
          potato: {
            "modlist.txt": "",
            "plugins.txt": "",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
          low: {
            "modlist.txt": "",
            "plugins.txt": "",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
          high: {
            "modlist.txt": "",
            "plugins.txt": "",
            "Skyrim.ini": "",
            "SkyrimPrefs.ini": "",
            "SkyrimCustom.ini": "",
          },
        },
      });

      mockProfileService.stubs.getProfileDirectories.resolves([
        `${mockProfilesDirectory}/potato`,
        `${mockProfilesDirectory}/low`,
        `${mockProfilesDirectory}/high`,
      ]);

      mockProfileService.stubs.getProfiles.resolves([
        { real: "mock-real-profile", friendly: "mock" },
      ]);

      mockGraphicsService.stubs.graphicsDirectory.returns(mockGraphicsPresets);

      mockGraphicsService.stubs.extractGraphicsFiles.callThrough();

      mockGraphicsService.stubs.graphicsMappingPath.returns(
        `${mockLauncherDirectory}/namesGraphics.json`
      );

      mockProfileService.stubs.profileMappingFile.returns(
        `${mockLauncherDirectory}/namesMO2.json`
      );

      mockProfileService.stubs.getMappedProfiles.resolves(mockProfiles);

      mockProfileService.stubs.getBackedUpProfileDirectories.resolves([
        `${mockProfileBackup}/potato`,
        `${mockProfileBackup}/low`,
        `${mockProfileBackup}/high`,
      ]);

      mockProfileService.stubs.profileDirectory.returns(mockProfilesDirectory);

      migrationService = new MigrationService(
        mockGraphicsService,
        mockProfileService,
        mockConfigService,
        getMockLogger()
      );
    });

    it("should not do anything if the user already has graphics presets", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(true);

      mockFs({
        [mockGraphicsPresets]: {
          low: {
            "mock-existing-file": "mock-content",
          },
        },
      });

      await migrationService.separateProfileFromGraphics();

      expect(
        (await fs.promises.readdir(`${mockGraphicsPresets}/low`)).sort()
      ).to.eql(["mock-existing-file"]);
    });

    it("should create the namesGraphics.json", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);
      await migrationService.separateProfileFromGraphics();

      expect(
        JSON.parse(
          await fs.promises.readFile(
            `${mockLauncherDirectory}/namesGraphics.json`,
            "utf-8"
          )
        )
      ).to.deepEqual([
        {
          real: "mock-real",
          friendly: "mock friendly",
        },
        {
          real: "mock-real-2",
          friendly: "mock friendly 2",
        },
      ]);
    });

    it("should add the customised profiles to the profile map", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);

      mockProfileService.stubs.isValid.resolves(true);
      mockProfileService.stubs.isValid.withArgs("mock-real").resolves(false);

      await migrationService.separateProfileFromGraphics();

      expect(
        JSON.parse(
          await fs.promises.readFile(
            `${mockLauncherDirectory}/namesMO2.json`,
            "utf-8"
          )
        )
      ).to.eql([
        {
          real: "0_Wildlander-STANDARD",
          friendly: "Standard Modlist",
        },
        {
          real: "0_Wildlander-PERFORMANCE",
          friendly: "Performance Modlist",
        },
        {
          real: "mock-real-2",
          friendly: "mock friendly 2",
          hidden: true,
        },
      ]);
    });

    it("should create a standard and performance modlist from the files", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);
      await migrationService.separateProfileFromGraphics();

      expect(
        (await fs.promises.readdir(`${mockGraphicsPresets}/low`)).sort()
      ).to.eql(["Skyrim.ini", "SkyrimCustom.ini", "SkyrimPrefs.ini"]);

      expect(
        (await fs.promises.readdir(`${mockGraphicsPresets}/potato`)).sort()
      ).to.eql(["Skyrim.ini", "SkyrimCustom.ini", "SkyrimPrefs.ini"]);
    });

    it("should select the first profile", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);
      await migrationService.separateProfileFromGraphics();

      sinon.assert.calledWith(
        mockProfileService.stubs.setProfilePreference,
        "mock-real-profile"
      );
    });
  });
});
