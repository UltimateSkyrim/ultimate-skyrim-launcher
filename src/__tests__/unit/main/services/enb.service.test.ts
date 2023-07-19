import { ConfigService } from "@/main/services/config.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { InstructionService } from "@/main/services/instruction.service";
import { getMockLogger } from "@/__tests__/unit/helpers/logger.mock";
import { EnbService } from "@/main/services/enb.service";
import mockFs from "mock-fs";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import { NoEnbsError } from "@/shared/errors/no-enbs.error";
import type { AdditionalInstruction } from "@/shared/types/additional-instructions";
import fs from "fs";
import { readFilesFromDirectory } from "@/__tests__/unit/helpers/read-files";

describe("ENB service", () => {
  let enbService: EnbService;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockInstructionService: StubbedInstanceWithSinonAccessor<InstructionService>;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    mockInstructionService = createStubInstance(InstructionService);

    enbService = new EnbService(
      mockConfigService,
      mockInstructionService,
      getMockLogger()
    );
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("enbDirectory", () => {
    it("should get the enb directory", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      expect(enbService.enbDirectory()).to.equal("test/launcher/ENB Presets");
    });
  });

  describe("getENBInstruction", () => {
    it("should get the enb presets", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
            test2: {},
            test3: {},
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
            { real: "test2", friendly: "test 2" },
          ]),
        },
      });
      expect(await enbService.getEnbPresets()).to.eql([
        { real: "test1", friendly: "test 1" },
        { real: "test2", friendly: "test 2" },
        { real: "test3", friendly: "test3" },
        {
          real: "noEnb",
          friendly: "No Shaders",
        },
      ]);
    });

    it("should only include directories in the unmapped enbs", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
            "test.txt": "",
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
          ]),
        },
      });
      expect(await enbService.getEnbPresets()).to.eql([
        { real: "test1", friendly: "test 1" },
        {
          real: "noEnb",
          friendly: "No Shaders",
        },
      ]);
    });

    it("should not include junk directories in the unmapped enbs", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
            ".DS_Store": "",
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
          ]),
        },
      });
      expect(await enbService.getEnbPresets()).to.eql([
        { real: "test1", friendly: "test 1" },
        {
          real: "noEnb",
          friendly: "No Shaders",
        },
      ]);
    });

    it("should throw an error if the directory cannot be read", async () => {
      mockConfigService.stubs.getPreference.returns("broken");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
            test2: {},
            test3: {},
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
            { real: "test2", friendly: "test 2" },
          ]),
        },
      });
      await expect(enbService.getEnbPresets()).to.be.rejectedWith(
        "ENOENT, no such file or directory 'broken/launcher/namesENB.json'"
      );
    });

    it("should throw an error if the namesENB.json cannot be read", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
            test2: {},
            test3: {},
          },
        },
      });
      await expect(enbService.getEnbPresets()).to.be.rejectedWith(
        "ENOENT, no such file or directory 'test/launcher/namesENB.json'"
      );
    });
  });

  describe("getEnbPreference", () => {
    it("should get the enb preference", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      expect(await enbService.getEnbPreference()).to.equal("test");
    });
  });

  describe("getDefaultPreference", () => {
    it("should get the default preference if it exists", async () => {
      const modDirectory = "test";
      mockFs({
        [`${modDirectory}/launcher`]: {
          "ENB Presets": {
            test1: {},
            test2: {},
            test3: {},
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
            { real: "test2", friendly: "test 2" },
          ]),
        },
      });
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("test1");
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      expect(await enbService.getDefaultPreference()).to.equal("test1");
    });

    it("should throw an error if no enb presets are found", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {},
          "namesENB.json": JSON.stringify([]),
        },
      });
      await expect(enbService.getDefaultPreference()).to.be.rejectedWith(
        NoEnbsError
      );
    });
  });

  describe("isValid", () => {
    it("should check if the enb is valid", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
          ]),
        },
      });
      expect(await enbService.isValid("test1")).to.equal(true);
      expect(await enbService.isValid("test4")).to.equal(false);
    });

    it("should check if the enb is valid with no enb", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {},
          },
          "namesENB.json": JSON.stringify([
            { real: "test1", friendly: "test 1" },
          ]),
        },
      });
      expect(await enbService.isValid("noEnb")).to.equal(true);
    });
  });

  describe("postSetEnb", () => {
    it("should run the post actions for a given enb", async () => {
      const instruction: AdditionalInstruction = {
        type: "enb",
        action: "disable-plugin",
        plugin: "test",
        target: "test",
      };
      mockConfigService.stubs.getPreference.returns("test");
      mockInstructionService.stubs.getInstructions.returns([instruction]);
      await enbService.postSetEnb("test1");
      sinon.assert.calledWith(
        mockInstructionService.stubs.execute,
        [instruction],
        "test1"
      );
    });

    it("should not run any additional instructions if none are related to enbs", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockInstructionService.stubs.getInstructions.returns([
        {
          type: "resolution-ratio",
          action: "disable-plugin",
          target: "test",
          plugin: "test",
        },
      ]);
      await enbService.postSetEnb("test1");
      sinon.assert.notCalled(mockInstructionService.stubs.execute);
    });
  });

  describe("getAllPossibleEnbFiles", () => {
    it("should get all possible enb files without junk files", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test1-only.ini": "",
            },
            test2: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test2-only.ini": "",
            },
            test3: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test3-only.ini": "",
              ".DS_Store": "",
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
      });
      expect(await enbService.getAllPossibleEnbFiles()).to.eql(
        new Set([
          "enbseries.ini",
          "enblocal.ini",
          "test1-only.ini",
          "test2-only.ini",
          "test3-only.ini",
        ])
      );
    });
  });

  describe("getExistingEnbFiles", () => {
    it("should get all existing enb files", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockConfigService.stubs.skyrimDirectory.returns("mock-skyrim-directory");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test1-only.ini": "",
            },
            test2: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test2-only.ini": "",
            },
            test3: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test3-only.ini": "",
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        "mock-skyrim-directory": {
          "enbseries.ini": "",
          "enblocal.ini": "",
          "test1-only.ini": "",
        },
      });
      expect((await enbService.getExistingEnbFiles()).sort()).to.eql(
        ["enbseries.ini", "enblocal.ini", "test1-only.ini"].sort()
      );
    });
  });

  describe("getEnbFilesForPreset", () => {
    it("should get enb files for a preset", async () => {
      mockConfigService.stubs.getPreference.returns("test");
      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test1-only.ini": "",
            },
            test2: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test2-only.ini": "",
            },
            test3: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test3-only.ini": "",
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
      });
      expect((await enbService.getEnbFilesForPreset("test1")).sort()).to.eql(
        ["enbseries.ini", "enblocal.ini", "test1-only.ini"].sort()
      );
    });
  });

  describe("deleteAllEnbFiles", () => {
    it("should delete all possible enb files from the skyrim directory", async () => {
      const skyrimDirectory = "mock-skyrim-directory";

      mockConfigService.stubs.getPreference.returns("test");
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      const skyrimEnbFiles = {
        "enbseries.ini": "",
        "enblocal.ini": "",
        "test1-only.ini": "",
        "test-directory": {
          "test-file": "",
        },
      };

      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test1-only.ini": "",
              "test-directory": {
                "test-file": "",
              },
            },
            test2: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test2-only.ini": "",
            },
            test3: {
              "enbseries.ini": "",
              "enblocal.ini": "",
              "test3-only.ini": "",
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: skyrimEnbFiles,
      });

      Object.keys(skyrimEnbFiles).forEach((file) => {
        expect(fs.existsSync(`${skyrimDirectory}/${file}`)).to.equal(true);
      });

      await enbService.deleteAllEnbFiles();

      Object.keys(skyrimEnbFiles).forEach((file) => {
        expect(fs.existsSync(`${skyrimDirectory}/${file}`)).to.equal(false);
      });
    });
  });

  describe("syncEnbFromGameToPresets", () => {
    it("should copy the enb files from the game folder to the preset folder", async () => {
      const skyrimDirectory = "mock-skyrim-directory";
      const presetName = "test1";

      mockConfigService.stubs.getPreference.returns("test");
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "original",
              "enblocal.ini": "original",
              "test1-only.ini": "original",
              "test-directory": {
                "test-file": "original",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "edited",
          "test1-only.ini": "original",
          "test-directory": {
            "test-file": "edited",
          },
        },
      });

      await enbService.syncEnbFromGameToPresets(presetName);

      expect(
        await readFilesFromDirectory(`test/launcher/ENB Presets/${presetName}`)
      ).to.eql({
        "enbseries.ini": "edited",
        "enblocal.ini": "original",
        "test1-only.ini": "original",
        "test-directory": {
          "test-file": "edited",
        },
      });
    });

    it("should not sync when the preset is noEnb", async () => {
      const skyrimDirectory = "mock-skyrim-directory";
      const presetName = "noEnb";

      mockConfigService.stubs.getPreference.returns("test");
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        "test/launcher": {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "original",
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "edited",
        },
      });

      await enbService.syncEnbFromGameToPresets(presetName);

      expect(
        await readFilesFromDirectory(`test/launcher/ENB Presets/test1`)
      ).to.eql({
        "enbseries.ini": "original",
      });
    });
  });

  describe("copyEnbFiles", () => {
    it("should copy all files from an enb preset to the skyrim directory after syncing the previous preset", async () => {
      const skyrimDirectory = "mock-skyrim-directory";
      const presetName = "new-preset";
      const modDirectory = "test/launcher";
      const previousPreset = "previous-preset";

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns("test");
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.PREVIOUS_ENB_PROFILE)
        .returns(previousPreset);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [modDirectory]: {
          "ENB Presets": {
            [presetName]: {
              "enbseries.ini": "new",
              "enblocal.ini": "new",
              "test1-only.ini": "new",
              "test-directory": {
                "test-file": "new",
              },
            },
            [previousPreset]: {
              "enbseries.ini": "previous",
              "enblocal.ini": "previous",
              "previous-only.ini": "previous",
              "test-directory": {
                "test-file": "previous",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "previous-edited",
          "test1-only.ini": "previous-edited",
          "previous-only.ini": "previous-edited",
          "test-directory": {
            "test-file": "previous-edited",
          },
        },
      });

      await enbService.copyEnbFiles(presetName);

      expect(
        await readFilesFromDirectory(
          `${modDirectory}/ENB Presets/${previousPreset}`
        )
      ).to.eql({
        "enbseries.ini": "previous-edited",
        "enblocal.ini": "previous",
        "previous-only.ini": "previous-edited",
        "test-directory": {
          "test-file": "previous-edited",
        },
      });

      expect(await readFilesFromDirectory(skyrimDirectory)).to.eql({
        "enbseries.ini": "new",
        "enblocal.ini": "new",
        "test1-only.ini": "new",
        "test-directory": {
          "test-file": "new",
        },
      });
    });

    it("should not sync previous profiles if there wasn't one set", async () => {
      const modDirectory = "test";
      const skyrimDirectory = "mock-skyrim-directory";
      const presetName = "new-preset";
      const launcherDirectory = `${modDirectory}/launcher`;
      const previousPreset = "previous-preset";

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.PREVIOUS_ENB_PROFILE)
        .returns(undefined);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            [presetName]: {
              "enbseries.ini": "new",
              "test1-only.ini": "new",
              "test-directory": {
                "test-file": "new",
              },
            },
            [previousPreset]: {
              "enbseries.ini": "previous",
              "previous-only.ini": "previous",
              "test-directory": {
                "test-file": "previous",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "previous-edited",
          "previous-only.ini": "previous-edited",
          "test-directory": {
            "test-file": "previous-edited",
          },
        },
      });

      await enbService.copyEnbFiles(presetName);

      expect(
        await readFilesFromDirectory(
          `${launcherDirectory}/ENB Presets/${previousPreset}`
        )
      ).to.eql({
        "enbseries.ini": "previous",
        "previous-only.ini": "previous",
        "test-directory": {
          "test-file": "previous",
        },
      });

      expect(await readFilesFromDirectory(skyrimDirectory)).to.eql({
        "enbseries.ini": "new",
        "test1-only.ini": "new",
        "test-directory": {
          "test-file": "new",
        },
      });
    });

    it("should just delete all enb files if noEnb is passed", async () => {
      const modDirectory = "test";
      const skyrimDirectory = "mock-skyrim-directory";
      const launcherDirectory = `${modDirectory}/launcher`;

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "new",
              "test1-only.ini": "new",
              "test-directory": {
                "test-file": "new",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "previous-edited",
          "test1-only.ini": "previous-edited",
          "test-directory": {
            "test-file": "previous-edited",
          },
          "skyrim.ini": "test",
        },
      });

      await enbService.copyEnbFiles("noEnb", true);

      expect(await readFilesFromDirectory(skyrimDirectory)).to.eql({
        "skyrim.ini": "test",
      });
    });
  });

  describe("restoreEnbPresets", () => {
    it("should restore all files from the backup", async () => {
      const modDirectory = "test";
      const launcherDirectory = `${modDirectory}/launcher`;
      const backupDirectory = "test/backup";
      const skyrimDirectory = "mock-skyrim-directory";

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("test1");
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1-edited",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1-edited",
              "test-directory": {
                "test-file": "test1-edited",
              },
            },
            test2: {
              "enbseries.ini": "test2",
              "enblocal.ini": "test2",
              "previous-only.ini": "test2-edited",
              "test-directory": {
                "test-file": "test2-edited",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "",
        },
        [backupDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1",
              "test-directory": {
                "test-file": "test1",
              },
              "backup-only.ini": "test1",
            },
            test2: {
              "enbseries.ini": "test2",
              "enblocal.ini": "test2",
              "previous-only.ini": "test2",
              "test-directory": {
                "test-file": "test2",
              },
            },
          },
        },
      });

      await enbService.restoreEnbPresets();

      expect(
        await readFilesFromDirectory(`${launcherDirectory}/ENB Presets`)
      ).to.eql({
        test1: {
          "enbseries.ini": "test1",
          "enblocal.ini": "test1",
          "test1-only.ini": "test1",
          "test-directory": {
            "test-file": "test1",
          },
          "backup-only.ini": "test1",
        },
        test2: {
          "enbseries.ini": "test2",
          "enblocal.ini": "test2",
          "previous-only.ini": "test2",
          "test-directory": {
            "test-file": "test2",
          },
        },
      });
    });
  });

  describe("backupOriginalEnbs", () => {
    it("should backup all files from the enb directory to the backup directory if they don't exist", async () => {
      const modDirectory = "test";
      const launcherDirectory = `${modDirectory}/launcher`;
      const backupDirectory = "test/backup";
      const skyrimDirectory = "mock-skyrim-directory";

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1",
              "test-directory": {
                "test-file": "test1",
              },
            },
            test2: {
              "enbseries.ini": "test2",
              "enblocal.ini": "test2",
              "previous-only.ini": "test2",
              "test-directory": {
                "test-file": "test2",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "",
        },
      });

      await enbService.backupOriginalEnbs();

      expect(
        await readFilesFromDirectory(`${backupDirectory}/ENB Presets`)
      ).to.eql({
        test1: {
          "enbseries.ini": "test1",
          "enblocal.ini": "test1",
          "test1-only.ini": "test1",
          "test-directory": {
            "test-file": "test1",
          },
        },
        test2: {
          "enbseries.ini": "test2",
          "enblocal.ini": "test2",
          "previous-only.ini": "test2",
          "test-directory": {
            "test-file": "test2",
          },
        },
      });
    });

    it("should not backup files that already exist in the backup directory", async () => {
      const modDirectory = "test";
      const launcherDirectory = `${modDirectory}/launcher`;
      const backupDirectory = "test/backup";
      const skyrimDirectory = "mock-skyrim-directory";

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.backupDirectory.returns(backupDirectory);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1",
              "test-directory": {
                "test-file": "test1",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "",
        },
        [backupDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1-backup",
              "enblocal.ini": "test1-backup",
              "test1-only.ini": "test1-backup",
              "test-directory": {
                "test-file": "test1-backup",
              },
            },
          },
        },
      });

      await enbService.backupOriginalEnbs();

      expect(
        await readFilesFromDirectory(`${backupDirectory}/ENB Presets`)
      ).to.eql({
        test1: {
          "enbseries.ini": "test1-backup",
          "enblocal.ini": "test1-backup",
          "test1-only.ini": "test1-backup",
          "test-directory": {
            "test-file": "test1-backup",
          },
        },
      });
    });
  });

  describe("setEnb", () => {
    it("should set the enb and call the post set actions", async () => {
      const modDirectory = "test";
      const launcherDirectory = `${modDirectory}/launcher`;
      const skyrimDirectory = "mock-skyrim-directory";
      const enbPreset = "test1";
      const instruction: AdditionalInstruction = {
        type: "enb",
        action: "disable-plugin",
        plugin: "test",
        target: "test",
      };

      mockInstructionService.stubs.getInstructions.returns([instruction]);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("previous-preset");

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1",
              "test-directory": {
                "test-file": "test1",
              },
            },
            test2: {
              "enbseries.ini": "test2",
              "enblocal.ini": "test2",
              "previous-only.ini": "test2",
              "test-directory": {
                "test-file": "test2",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "",
        },
      });

      await enbService.setEnb(enbPreset);

      sinon.assert.calledWith(
        mockConfigService.stubs.setPreference,
        USER_PREFERENCE_KEYS.PREVIOUS_ENB_PROFILE,
        "previous-preset"
      );

      sinon.assert.calledWith(
        mockConfigService.stubs.setPreference,
        USER_PREFERENCE_KEYS.ENB_PROFILE,
        enbPreset
      );

      sinon.assert.calledWith(
        mockInstructionService.stubs.execute,
        [instruction],
        "test1"
      );

      expect(await readFilesFromDirectory(`${skyrimDirectory}`)).to.eql({
        "enbseries.ini": "test1",
        "enblocal.ini": "test1",
        "test1-only.ini": "test1",
        "test-directory": {
          "test-file": "test1",
        },
      });
    });
  });

  describe("resetCurrentEnb", () => {
    it("should set the enb with the current preference", async () => {
      const modDirectory = "test";
      const launcherDirectory = `${modDirectory}/launcher`;
      const skyrimDirectory = "mock-skyrim-directory";

      mockInstructionService.stubs.getInstructions.returns([]);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);
      mockConfigService.stubs.skyrimDirectory.returns(skyrimDirectory);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.ENB_PROFILE)
        .returns("test1");

      mockFs({
        [launcherDirectory]: {
          "ENB Presets": {
            test1: {
              "enbseries.ini": "test1",
              "enblocal.ini": "test1",
              "test1-only.ini": "test1",
              "test-directory": {
                "test-file": "test1",
              },
            },
          },
          "namesENB.json": JSON.stringify([]),
        },
        [skyrimDirectory]: {
          "enbseries.ini": "",
        },
      });

      await enbService.resetCurrentEnb();

      expect(await readFilesFromDirectory(`${skyrimDirectory}`)).to.eql({
        "enbseries.ini": "test1",
        "enblocal.ini": "test1",
        "test1-only.ini": "test1",
        "test-directory": {
          "test-file": "test1",
        },
      });
    });
  });
});
