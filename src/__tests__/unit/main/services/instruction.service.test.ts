import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { InstructionService } from "@/main/services/instruction.service";
import { ProfileService } from "@/main/services/profile.service";
import { WabbajackService } from "@/main/services/wabbajack.service";
import type { ElectronLog } from "electron-log";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { mockDirent } from "@/__tests__/unit/helpers/mocks/dirent.mock";
import mockFs from "mock-fs";
import fs from "fs/promises";
import os from "os";
import type { AdditionalInstructions } from "@/shared/types/additional-instructions";
import {
  InstructionAction,
  InstructionType,
} from "@/shared/enums/additional-instructions";

describe("Instruction service", () => {
  let instructionService: InstructionService;
  let mockProfileService: StubbedInstanceWithSinonAccessor<ProfileService>;
  let mockWabbajackService: StubbedInstanceWithSinonAccessor<WabbajackService>;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;

  beforeEach(() => {
    mockProfileService = createStubInstance(ProfileService);
    mockWabbajackService = createStubInstance(WabbajackService);
    mockLogger = getMockLogger();

    instructionService = new InstructionService(
      mockProfileService,
      mockWabbajackService,
      mockLogger
    );
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  describe("execute", () => {
    let pluginsPath: string;
    let modsPath: string;

    beforeEach(() => {
      const profileLocation = "/path/to/profiles";
      pluginsPath = `${profileLocation}/profile1/plugins.txt`;
      modsPath = `${profileLocation}/profile1/modlist.txt`;

      mockProfileService.stubs.profileDirectory.returns(profileLocation);

      mockProfileService.stubs.getPhysicalProfiles.resolves([
        {
          ...mockDirent,
          name: `profile1`,
        },
      ]);

      mockFs({
        [pluginsPath]: [
          "disabledPlugin1.esp",
          "disabledPlugin2.esp",
          "*enabledPlugin1.esp",
          "*enabledPlugin2.esp",
        ].join(os.EOL),
        [modsPath]: [
          "+enabledMod1.esp",
          "-disabledMod1.esp",
          "+enabledMod2.esp",
          "-disabledMod2.esp",
        ].join(os.EOL),
      });
    });

    it("should execute enabling and disabling plugins", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_PLUGIN,
          type: InstructionType.ENB,
          target: "test",
          plugin: "enabledPlugin1.esp",
        },
        {
          action: InstructionAction.ENABLE_PLUGIN,
          type: InstructionType.RESOLUTION_RATIO,
          target: "test",
          plugin: "disabledPlugin2.esp",
        },
      ];

      await instructionService.execute(instructions, "test");

      expect(await fs.readFile(pluginsPath, "utf-8")).to.equal(
        [
          "disabledPlugin1.esp",
          "*disabledPlugin2.esp",
          "enabledPlugin1.esp",
          "*enabledPlugin2.esp",
        ].join("\n")
      );
    });

    it("should execute enabling and disabling mods", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_MOD,
          type: InstructionType.ENB,
          target: "test",
          mod: "enabledMod1.esp",
        },
        {
          action: InstructionAction.ENABLE_MOD,
          type: InstructionType.RESOLUTION_RATIO,
          target: "test",
          mod: "disabledMod2.esp",
        },
      ];

      await instructionService.execute(instructions, "test");

      expect(await fs.readFile(modsPath, "utf-8")).to.equal(
        [
          "-enabledMod1.esp",
          "-disabledMod1.esp",
          "+enabledMod2.esp",
          "+disabledMod2.esp",
        ].join("\n")
      );
    });

    it("should do the inverse of the instruction for plugins if the targets don't match", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_PLUGIN,
          type: InstructionType.ENB,
          target: "test",
          plugin: "enabledPlugin1.esp",
        },
        {
          action: InstructionAction.ENABLE_PLUGIN,
          type: InstructionType.RESOLUTION_RATIO,
          target: "test",
          plugin: "disabledPlugin2.esp",
        },
      ];

      await instructionService.execute(instructions, "no match");

      expect(await fs.readFile(pluginsPath, "utf-8")).to.equal(
        [
          "disabledPlugin1.esp",
          "disabledPlugin2.esp",
          "*enabledPlugin1.esp",
          "*enabledPlugin2.esp",
        ].join("\n")
      );
    });

    it("should do the inverse of the instruction for mods if the targets don't match", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_MOD,
          type: InstructionType.ENB,
          target: "test",
          mod: "enabledMod1.esp",
        },
        {
          action: InstructionAction.ENABLE_MOD,
          type: InstructionType.RESOLUTION_RATIO,
          target: "test",
          mod: "disabledMod2.esp",
        },
      ];

      await instructionService.execute(instructions, "not match");

      expect(await fs.readFile(modsPath, "utf-8")).to.equal(
        [
          "+enabledMod1.esp",
          "-disabledMod1.esp",
          "+enabledMod2.esp",
          "-disabledMod2.esp",
        ].join("\n")
      );
    });

    it("should execute disabling ultra widescreen and return true", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_ULTRA_WIDESCREEN,
        },
      ];

      const result = await instructionService.execute(instructions);

      expect(result).to.be.true();
    });

    it("should execute if one of the targets match", async () => {
      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_PLUGIN,
          type: InstructionType.ENB,
          target: ["test", "test2"],
          plugin: "enabledPlugin1.esp",
        },
      ];

      await instructionService.execute(instructions, "test2");

      expect(await fs.readFile(pluginsPath, "utf-8")).to.equal(
        [
          "disabledPlugin1.esp",
          "disabledPlugin2.esp",
          "enabledPlugin1.esp",
          "*enabledPlugin2.esp",
        ].join("\n")
      );
    });

    it("should execute only if the version matches", async () => {
      mockWabbajackService.stubs.getModpackVersion.resolves("1.0.0");

      const instructions: AdditionalInstructions = [
        {
          action: InstructionAction.DISABLE_PLUGIN,
          type: InstructionType.ENB,
          target: "test",
          plugin: "enabledPlugin1.esp",
          version: "1.0.0",
        },
        {
          action: InstructionAction.DISABLE_PLUGIN,
          type: InstructionType.ENB,
          target: "test",
          plugin: "enabledPlugin2.esp",
          version: "2.0.0",
        },
      ];

      await instructionService.execute(instructions, "test");

      expect(await fs.readFile(pluginsPath, "utf-8")).to.equal(
        [
          "disabledPlugin1.esp",
          "disabledPlugin2.esp",
          "enabledPlugin1.esp",
          "*enabledPlugin2.esp",
        ].join("\n")
      );
    });
  });

  it("should return the additional instructions", async () => {
    expect(instructionService.getInstructions()).to.containDeep([
      {
        action: "disable-plugin",
        type: "enb",
        target: "noEnb",
        plugin: "NightEyeENBFix_PredatorVision.esp",
      },
      {
        action: "disable-ultra-widescreen",
        version: "1.0.0",
      },
      {
        action: "enable-mod",
        type: "resolution-ratio",
        target: "21:9",
        mod: "Wildlander 21-9 Resolution Support",
      },
      {
        action: "enable-mod",
        type: "resolution-ratio",
        target: "32:9",
        mod: "Wildlander 32-9 Resolution Support",
      },
      {
        action: "enable-plugin",
        type: "resolution-ratio",
        target: ["21:9", "32:9"],
        plugin: "widescreen_skyui_fix.esp",
      },
    ]);
  });

  it("should read lines from a file", async () => {
    const pathToPlugins = "/path/to/plugins.txt";

    mockFs({
      [pathToPlugins]: ["plugin1.esp", "plugin2.esp", "*plugin3.esp"].join(
        os.EOL
      ),
    });

    const plugins = await instructionService.readLinesFromFile(pathToPlugins);

    expect(plugins).to.containDeep([
      "plugin1.esp",
      "plugin2.esp",
      "*plugin3.esp",
    ]);
  });

  it("should toggle the plugin to be enabled if it was disabled", async () => {
    const profileLocation = "/path/to/profiles";
    const firstProfilePlugins = `${profileLocation}/profile1/plugins.txt`;
    const secondProfilePlugins = `${profileLocation}/profile2/plugins.txt`;

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    mockFs({
      [firstProfilePlugins]: [
        "plugin1.esp",
        "plugin2.esp",
        "*plugin3.esp",
      ].join(os.EOL),
      [secondProfilePlugins]: [
        "plugin1.esp",
        "*plugin3.esp",
        "plugin2.esp",
      ].join(os.EOL),
    });

    await instructionService.togglePlugin("plugin1.esp", "enable");
    expect(await fs.readFile(firstProfilePlugins, "utf-8")).to.equal(
      ["*plugin1.esp", "plugin2.esp", "*plugin3.esp"].join("\n")
    );
    expect(await fs.readFile(secondProfilePlugins, "utf-8")).to.equal(
      ["*plugin1.esp", "*plugin3.esp", "plugin2.esp"].join("\n")
    );
  });

  it("should toggle the plugin and disable it if it is disabled", async () => {
    const profileLocation = "/path/to/profiles";
    const firstProfilePlugins = `${profileLocation}/profile1/plugins.txt`;
    const secondProfilePlugins = `${profileLocation}/profile2/plugins.txt`;

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    mockFs({
      [firstProfilePlugins]: [
        "*plugin1.esp",
        "plugin2.esp",
        "*plugin3.esp",
      ].join(os.EOL),
      [secondProfilePlugins]: [
        "*plugin1.esp",
        "*plugin3.esp",
        "plugin2.esp",
      ].join(os.EOL),
    });

    await instructionService.togglePlugin("plugin1.esp", "disable");
    expect(await fs.readFile(firstProfilePlugins, "utf-8")).to.equal(
      ["plugin1.esp", "plugin2.esp", "*plugin3.esp"].join("\n")
    );
    expect(await fs.readFile(secondProfilePlugins, "utf-8")).to.equal(
      ["plugin1.esp", "*plugin3.esp", "plugin2.esp"].join("\n")
    );
  });

  it("should toggle the mod and enable it if it is disabled", async () => {
    const profileLocation = "/path/to/profiles";
    const firstProfileMods = `${profileLocation}/profile1/modlist.txt`;
    const secondProfileMods = `${profileLocation}/profile2/modlist.txt`;

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    mockFs({
      [firstProfileMods]: ["+mod1.esp", "-mod2.esp", "+mod3.esp"].join(os.EOL),
      [secondProfileMods]: ["+mod1.esp", "+mod3.esp", "-mod2.esp"].join(os.EOL),
    });

    await instructionService.toggleMod("mod2.esp", "enable");
    expect(await fs.readFile(firstProfileMods, "utf-8")).to.equal(
      ["+mod1.esp", "+mod2.esp", "+mod3.esp"].join("\n")
    );
    expect(await fs.readFile(secondProfileMods, "utf-8")).to.equal(
      ["+mod1.esp", "+mod3.esp", "+mod2.esp"].join("\n")
    );
  });

  it("should toggle the mod and disable it if it is enabled", async () => {
    const profileLocation = "/path/to/profiles";
    const firstProfileMods = `${profileLocation}/profile1/modlist.txt`;
    const secondProfileMods = `${profileLocation}/profile2/modlist.txt`;

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    mockFs({
      [firstProfileMods]: ["-mod1.esp", "+mod2.esp", "+mod3.esp"].join(os.EOL),
      [secondProfileMods]: ["-mod1.esp", "+mod3.esp", "+mod2.esp"].join(os.EOL),
    });

    await instructionService.toggleMod("mod2.esp", "disable");
    expect(await fs.readFile(firstProfileMods, "utf-8")).to.equal(
      ["-mod1.esp", "-mod2.esp", "+mod3.esp"].join("\n")
    );
    expect(await fs.readFile(secondProfileMods, "utf-8")).to.equal(
      ["-mod1.esp", "+mod3.esp", "-mod2.esp"].join("\n")
    );
  });

  it("should get the plugin files", async () => {
    const profileLocation = "/path/to/profiles";

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    expect(await instructionService.getPluginFiles()).to.containDeep([
      `${profileLocation}/profile1/plugins.txt`,
      `${profileLocation}/profile2/plugins.txt`,
    ]);
  });

  it("should get the modlist files", async () => {
    const profileLocation = "/path/to/profiles";

    mockProfileService.stubs.profileDirectory.returns(profileLocation);

    mockProfileService.stubs.getPhysicalProfiles.resolves([
      {
        ...mockDirent,
        name: `profile1`,
      },
      {
        ...mockDirent,
        name: `profile2`,
      },
    ]);

    expect(await instructionService.getModlistFiles()).to.containDeep([
      `${profileLocation}/profile1/modlist.txt`,
      `${profileLocation}/profile2/modlist.txt`,
    ]);
  });
});
