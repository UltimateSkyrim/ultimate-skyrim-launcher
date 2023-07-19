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

describe("Profile service", () => {
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

  it("should set if the user is showing hidden profiles", () => {
    mockConfigService.stubs.getPreference
      .withArgs(USER_PREFERENCE_KEYS.SHOW_HIDDEN_PROFILE)
      .returns(true);
    profileService.setShowHiddenProfiles(false);

    mockConfigService.stubs.setPreference.calledWith(sinon.match.string, false);
  });

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
