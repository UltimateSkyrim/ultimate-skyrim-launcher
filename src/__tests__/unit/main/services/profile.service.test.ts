import mockFs from "mock-fs";
import type { FriendlyDirectoryMap } from "@/shared/types/modpack-metadata";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { ConfigService } from "@/main/services/config.service";
import { ProfileService } from "@/main/services/profile.service";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { readFilesFromDirectory } from "@/__tests__/unit/helpers/read-files";

describe("Profile service #main #service", () => {
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let profileService: ProfileService;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    profileService = new ProfileService(mockConfigService, getMockLogger());
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("profileDirectory", () => {
    it("should return the profile directory", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);

      expect(profileService.profileDirectory()).to.eql(
        `${modDirectory}/profiles`
      );
    });
  });

  describe("profileBackupDirectory", () => {
    it("should return the profile backup directory", async () => {
      const backupDirectory = "mock/backup";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);

      expect(profileService.profileBackupDirectory()).to.eql(
        `${backupDirectory}/profiles`
      );
    });
  });

  describe("profileMappingFile", () => {
    it("should return the profile mapping file", async () => {
      const launcherDirectory = "mock/launcher/directory";
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      expect(profileService.profileMappingFile()).to.eql(
        `${launcherDirectory}/namesMO2.json`
      );
    });
  });

  describe("getShowHiddenProfiles", () => {
    it("should get if the user is showing hidden profiles", () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE)
        .returns(true);

      expect(profileService.getShowHiddenProfiles()).to.eql(true);
    });

    it("should default showing hidden profiles to false if the key doesn't exist", () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE)
        .returns(undefined);

      expect(profileService.getShowHiddenProfiles()).to.eql(false);
    });
  });

  describe("setShowHiddenProfiles", () => {
    it("should set if the user is showing hidden profiles", () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE)
        .returns(true);
      profileService.setShowHiddenProfiles(false);

      mockConfigService.stubs.setPreference.calledWith(
        sinon.match.string,
        false
      );
    });
  });

  describe("getProfiles", () => {
    it("should get the profiles", async () => {
      const modDirectory = "mod/directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      mockFs({
        [`${launcherDirectory}/namesMO2.json`]: JSON.stringify([
          {
            real: "mock-real-name",
            friendly: "mock friendly name",
          },
        ] as FriendlyDirectoryMap[]),
        [`${modDirectory}/profiles/mock-real-name`]: {},
        [`${modDirectory}/profiles/unmapped`]: {},
      });

      const profiles = await profileService.getProfiles();
      const expected: FriendlyDirectoryMap[] = [
        {
          real: "mock-real-name",
          friendly: "mock friendly name",
        },
        {
          real: "unmapped",
          friendly: "unmapped",
        },
      ];

      expect(profiles).to.eql(expected);
    });
  });

  describe("getMappedProfiles", () => {
    it("should get the mapped profiles", async () => {
      const modDirectory = "mod/directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      mockFs({
        [`${launcherDirectory}/namesMO2.json`]: JSON.stringify([
          {
            real: "mock-real-name",
            friendly: "mock friendly name",
          },
        ] as FriendlyDirectoryMap[]),
        [`${modDirectory}/profiles/mock-real-name`]: {},
        [`${modDirectory}/profiles/unmapped`]: {},
      });

      const profiles = await profileService.getMappedProfiles();

      expect(profiles).to.eql([
        {
          real: "mock-real-name",
          friendly: "mock friendly name",
        },
      ]);
    });

    it("should return an empty array if there are no mapped profiles", async () => {
      const modDirectory = "mod/directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      mockFs({
        [`${launcherDirectory}/namesMO2.json`]: JSON.stringify([]),
        [`${modDirectory}/profiles/mock-real-name`]: {},
        [`${modDirectory}/profiles/unmapped`]: {},
      });

      const profiles = await profileService.getMappedProfiles();

      expect(profiles).to.eql([]);
    });
  });

  describe("getUnmappedProfiles", () => {
    it("should get the unmapped profiles", async () => {
      const modDirectory = "mod/directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      const mappedProfiles: FriendlyDirectoryMap[] = [
        {
          real: "mock-real-name",
          friendly: "mock friendly name",
        },
      ];

      mockFs({
        [`${launcherDirectory}/namesMO2.json`]: JSON.stringify(mappedProfiles),
        [`${modDirectory}/profiles/mock-real-name`]: {},
        [`${modDirectory}/profiles/unmapped`]: {},
      });

      const profiles = await profileService.getUnmappedProfiles(mappedProfiles);

      expect(profiles).to.eql([
        {
          real: "unmapped",
          friendly: "unmapped",
        },
      ]);
    });
  });

  describe("getProfileDirectories", () => {
    it("should get the profile's directories", async () => {
      const modDirectory = "mod/directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockConfigService.stubs.launcherDirectory.returns(launcherDirectory);

      mockFs({
        [`${launcherDirectory}/namesMO2.json`]: JSON.stringify([
          {
            real: "mock-real-name",
            friendly: "mock friendly name",
          },
        ] as FriendlyDirectoryMap[]),
        [`${modDirectory}/profiles/unmapped`]: {},
        [`${modDirectory}/profiles/mock-real-name`]: {},
      });

      const profileDirectories = await profileService.getProfileDirectories();
      const expected = [
        `${modDirectory}/profiles/mock-real-name`,
        `${modDirectory}/profiles/unmapped`,
      ];

      expect(profileDirectories).to.eql(expected);
    });

    it("should prepend the profile directory", () => {
      const modDirectory = "mod/directory";

      mockConfigService.stubs.modDirectory.returns(modDirectory);

      expect(profileService.prependProfileDirectory("mock-file.json")).to.eql(
        "mod/directory/profiles/mock-file.json"
      );
    });
  });

  describe("getBackedUpProfiles", () => {
    it("should get the backup", async () => {
      const backupDirectory = "backup/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);

      mockFs({
        [`${backupDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.getBackedUpProfiles()).to.eql([
        "mock-profile-1",
        "mock-profile-2",
      ]);
    });

    it("should throw an error if the backup does not exist", async () => {
      const backupDirectory = "backup/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);

      mockFs({});

      await expect(profileService.getBackedUpProfiles()).to.be.rejectedWith(
        Error
      );
    });
  });

  describe("getBackedUpProfileDirectories", () => {
    it("should get the backed up profile directories", async () => {
      const backupDirectory = "backup/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);

      mockFs({
        [`${backupDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.getBackedUpProfileDirectories()).to.eql([
        `${backupDirectory}/profiles/mock-profile-1`,
        `${backupDirectory}/profiles/mock-profile-2`,
      ]);
    });

    it("should throw an error if the backup does not exist", async () => {
      const backupDirectory = "backup/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);

      mockFs({});

      await expect(
        profileService.getBackedUpProfileDirectories()
      ).to.be.rejectedWith(Error);
    });
  });

  describe("PrependProfileDirectory", () => {
    it("should prepend the profile directory", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);

      expect(profileService.prependProfileDirectory("mock-file.json")).to.eql(
        "mod/directory/profiles/mock-file.json"
      );
    });
  });

  describe("getProfilePreference", () => {
    it("should return the profile preference", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.PRESET)
        .returns("mock-profile");
      expect(await profileService.getProfilePreference()).to.eql(
        "mock-profile"
      );
    });
  });

  describe("getDefaultPreference", () => {
    it("should return the first profile in the list", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.getDefaultPreference()).to.eql(
        "mock-profile-1"
      );
    });

    it("should throw an error if there is no profiles found", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {},
      });

      await expect(profileService.getDefaultPreference()).to.be.rejectedWith(
        Error
      );
    });
  });

  describe("setProfilePreference", () => {
    it("should set the profile preference", async () => {
      profileService.setProfilePreference("mock-profile");

      sinon.assert.calledWith(
        mockConfigService.stubs.setPreference,
        USER_PREFERENCE_KEYS.PRESET,
        "mock-profile"
      );
    });
  });

  describe("isInProfileList", () => {
    it("should return true if the profile is in the list", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.isInProfileList("mock-profile-1")).to.eql(
        true
      );
    });

    it("should return false if the profile is not in the list", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.isInProfileList("mock-profile-3")).to.eql(
        false
      );
    });
  });

  describe("isValid", () => {
    it("should return true if the profile is valid", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.isValid("mock-profile-1")).to.eql(true);
    });

    it("should return false if the profile is not valid", async () => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.modDirectory.returns(modDirectory);
      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      expect(await profileService.isValid("mock-profile-3")).to.eql(false);
    });
  });

  describe("backupOriginalProfiles", () => {
    it("should backup the profiles if no backup exists", async () => {
      const backupDirectory = "backup/directory";
      const modDirectory = "mod/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.modDirectory.returns(modDirectory);

      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      await profileService.backupOriginalProfiles();

      expect(await readFilesFromDirectory(backupDirectory)).to.eql({
        profiles: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });
    });

    it("should not backup if there is one", async () => {
      const backupDirectory = "backup/directory";
      const modDirectory = "mod/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.modDirectory.returns(modDirectory);

      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-3": {
            test: "testing",
          },
          "mock-profile-4": {
            test: "testing2",
          },
        },
        [`${backupDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      await profileService.backupOriginalProfiles();

      expect(await readFilesFromDirectory(backupDirectory)).to.eql({
        profiles: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });
    });
  });

  describe("restoreProfiles", () => {
    it("should restore the profiles from the backup but not overwrite other profiles", async () => {
      const backupDirectory = "backup/directory";
      const modDirectory = "mod/directory";
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.modDirectory.returns(modDirectory);

      mockFs({
        [`${modDirectory}/profiles`]: {
          "mock-profile-3": {
            test: "testing",
          },
          "mock-profile-4": {
            test: "testing2",
          },
        },
        [`${backupDirectory}/profiles`]: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
        },
      });

      await profileService.restoreProfiles();

      expect(await readFilesFromDirectory(modDirectory)).to.eql({
        profiles: {
          "mock-profile-1": {
            test: "test",
          },
          "mock-profile-2": {
            test: "test2",
          },
          "mock-profile-3": {
            test: "testing",
          },
          "mock-profile-4": {
            test: "testing2",
          },
        },
      });
    });
  });
});
