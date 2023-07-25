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
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import type { DirectoryItems } from "mock-fs/lib/filesystem";
import { readFilesFromDirectory } from "@/__tests__/unit/helpers/read-files";

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
    let mockFSBase: DirectoryItems;

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

      mockFSBase = {
        [mockLauncherDirectory]: {
          "namesMO2.json": JSON.stringify(mockProfiles),
        },
        [mockProfilesDirectory]: {
          potato: {
            "modlist.txt": "potato",
            "plugins.txt": "potato",
            "Skyrim.ini": "potato",
            "SkyrimPrefs.ini": "potato",
            "SkyrimCustom.ini": "potato",
          },
          low: {
            "modlist.txt": "modified-modlist",
            "plugins.txt": "modified-plugins",
            "Skyrim.ini": "low",
            "SkyrimPrefs.ini": "low",
            "SkyrimCustom.ini": "low",
          },
          high: {
            "modlist.txt": "high",
            "plugins.txt": "high",
            "Skyrim.ini": "high",
            "SkyrimPrefs.ini": "high",
            "SkyrimCustom.ini": "high",
          },
        },
        [mockProfileBackup]: {
          potato: { "potato.ini": "potato" },
          low: { "low.ini": "content" },
          high: { "high.ini": "content" },
        },
        [`${mockLauncherDirectory}/backup/Graphics Presets`]: {
          potato: {
            "modlist.txt": "potato",
            "plugins.txt": "potato",
            "Skyrim.ini": "potato",
            "SkyrimPrefs.ini": "potato",
            "SkyrimCustom.ini": "potato",
          },
          low: {
            "modlist.txt": "low",
            "plugins.txt": "low",
            "Skyrim.ini": "low",
            "SkyrimPrefs.ini": "low",
            "SkyrimCustom.ini": "low",
          },
          high: {
            "modlist.txt": "high",
            "plugins.txt": "high",
            "Skyrim.ini": "high",
            "SkyrimPrefs.ini": "high",
            "SkyrimCustom.ini": "high",
          },
        },
      };
      mockFs(mockFSBase);

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

    it("should create the performance profile from the backup if it exists", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);
      mockProfileService.stubs.getBackedUpProfileDirectories.resolves([
        `${mockProfileBackup}/high`,
        `${mockProfileBackup}/low`,
        `${mockProfileBackup}/potato`,
      ]);

      mockConfigService.stubs.backupsExist.returns(true);

      await migrationService.separateProfileFromGraphics();

      expect(
        await readFilesFromDirectory(
          `${mockProfilesDirectory}/0_Wildlander-STANDARD`
        )
      ).to.containDeep({
        "high.ini": "content",
      });
      expect(
        await readFilesFromDirectory(
          `${mockProfilesDirectory}/0_Wildlander-PERFORMANCE`
        )
      ).to.containDeep({
        "potato.ini": "potato",
      });
    });

    it("should should create the performance profile from a backup and use the first if there is no potato profile", async () => {
      mockGraphicsService.stubs.graphicsExist.resolves(false);
      mockProfileService.stubs.getBackedUpProfileDirectories.resolves([
        `${mockProfileBackup}/high`,
        `${mockProfileBackup}/low`,
      ]);

      mockProfileService.stubs.getProfileDirectories.resolves([
        `${mockProfilesDirectory}/high`,
        `${mockProfilesDirectory}/low`,
      ]);

      mockConfigService.stubs.backupsExist.returns(true);

      await migrationService.separateProfileFromGraphics();

      expect(
        await readFilesFromDirectory(
          `${mockProfilesDirectory}/0_Wildlander-PERFORMANCE`
        )
      ).to.containDeep({
        "low.ini": "content",
      });
    });

    it("should create the performance profile and use the first if there is no backups and no potato profile", async () => {
      mockConfigService.stubs.backupsExist.returns(false);

      mockProfileService.stubs.getProfileDirectories.resolves([
        `${mockProfilesDirectory}/low`,
        `${mockProfilesDirectory}/high`,
      ]);

      mockFs({
        ...mockFSBase,
        [mockProfilesDirectory]: {
          low: {
            "modlist.txt": "modified-modlist",
            "plugins.txt": "modified-plugins",
            "Skyrim.ini": "low",
            "SkyrimPrefs.ini": "low",
            "SkyrimCustom.ini": "low",
          },
          high: {
            "modlist.txt": "high",
            "plugins.txt": "high",
            "Skyrim.ini": "high",
            "SkyrimPrefs.ini": "high",
            "SkyrimCustom.ini": "high",
          },
        },
      });

      await migrationService.separateProfileFromGraphics();

      expect(
        await readFilesFromDirectory(
          `${mockProfilesDirectory}/0_Wildlander-PERFORMANCE`
        )
      ).to.containDeep({
        "modlist.txt": "modified-modlist",
        "plugins.txt": "modified-plugins",
        "Skyrim.ini": "low",
        "SkyrimPrefs.ini": "low",
        "SkyrimCustom.ini": "low",
      });
    });
  });
});
