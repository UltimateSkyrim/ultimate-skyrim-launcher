import { ResolutionService } from "@/main/services/resolution.service";
import type { StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import { createStubInstance, expect, sinon } from "@loopback/testlab";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { ConfigService } from "@/main/services/config.service";
import { InstructionService } from "@/main/services/instruction.service";
import {
  InstructionAction,
  InstructionType,
} from "@/shared/enums/additional-instructions";
import type Electron from "electron";
import type {
  OverloadParameters,
  OverloadReturnType,
} from "@/shared/types/overloads";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import mockFs from "mock-fs";
import { stringify } from "ini";
import fs from "fs/promises";
import { getChildProcessMock } from "@/__tests__/unit/helpers/mocks/child-process.mock";
import type * as child_process from "child_process";
import os from "os";
import { parse } from "js-ini";

describe("Resolution service", () => {
  let resolutionService: ResolutionService;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockInstructionService: StubbedInstanceWithSinonAccessor<InstructionService>;
  let getPrimaryDisplayStub: sinon.SinonStub<
    OverloadParameters<Electron.Screen["getPrimaryDisplay"]>,
    OverloadReturnType<Electron.Screen["getPrimaryDisplay"]>
  >;
  let mockChildProcess: StubbedInstanceWithSinonAccessor<typeof child_process>;
  let primaryDisplayMockReturn: Electron.Display;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    mockInstructionService = createStubInstance(InstructionService);
    getPrimaryDisplayStub = sinon.stub();
    primaryDisplayMockReturn = {
      size: {
        height: 1080,
        width: 1920,
      },
      scaleFactor: 1,
      accelerometerSupport: "unknown",
      bounds: {
        height: 1080,
        width: 1920,
        x: 0,
        y: 0,
      },
      colorDepth: 0,
      colorSpace: "",
      depthPerComponent: 0,
      displayFrequency: 0,
      id: 0,
      internal: false,
      monochrome: false,
      rotation: 0,
      touchSupport: "unknown",
      workArea: {
        height: 1080,
        width: 1920,
        x: 0,
        y: 0,
      },
      workAreaSize: {
        height: 1080,
        width: 1920,
      },
    };
    getPrimaryDisplayStub.returns(primaryDisplayMockReturn);

    mockChildProcess = getChildProcessMock();

    resolutionService = new ResolutionService(
      mockConfigService,
      mockInstructionService,
      getMockLogger(),
      true,
      {
        screen: { getPrimaryDisplay: getPrimaryDisplayStub },
      } as unknown as typeof Electron,
      mockChildProcess
    );
  });

  afterEach(() => {
    sinon.restore();
    mockFs.restore();
  });

  describe("getResourcePath", () => {
    it("should return the local resource path if in development", async () => {
      expect(resolutionService.getResourcePath()).to.equal(
        `${process.cwd()}/src/assets`
      );
    });

    it("should return the app resource path if not in development", async () => {
      resolutionService = new ResolutionService(
        mockConfigService,
        mockInstructionService,
        getMockLogger(),
        false,
        {} as unknown as typeof Electron,
        mockChildProcess
      );

      // Electron assigns this variable at runtime in a packaged app.
      // TypeScript and IDEs see it as readonly, so it must be ignored.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      // noinspection JSConstantReassignment
      process.resourcesPath = "mock/resources/path";
      expect(resolutionService.getResourcePath()).to.equal(
        "mock/resources/path"
      );
    });
  });

  describe("isUltraWidescreen", () => {
    it("should return true if the resolution is ultra-widescreen", async () => {
      expect(
        resolutionService.isUltraWidescreen({ width: 3480, height: 1440 })
      ).to.equal(true);
    });

    it("should return false if the resolution is not ultra-widescreen", async () => {
      expect(
        resolutionService.isUltraWidescreen({ width: 1920, height: 1080 })
      ).to.equal(false);
    });
  });

  describe("getClosestSupportedRatio", () => {
    it("should return the closest supported ratio", async () => {
      expect(
        resolutionService.getClosestSupportedRatio({
          width: 1920,
          height: 1080,
        })
      ).to.equal("16:9");
      expect(
        resolutionService.getClosestSupportedRatio({
          width: 2560,
          height: 1080,
        })
      ).to.equal("21:9");
      expect(
        resolutionService.getClosestSupportedRatio({
          width: 3840,
          height: 1080,
        })
      ).to.equal("32:9");
      expect(
        resolutionService.getClosestSupportedRatio({
          width: 1111,
          height: 2222,
        })
      ).to.equal("16:9");
    });
  });

  describe("setShouldDisableUltraWidescreen", () => {
    it("should set the value if the instruction service has the instruction", async () => {
      mockInstructionService.stubs.getInstructions.returns([
        {
          action: InstructionAction.DISABLE_ULTRA_WIDESCREEN,
          version: "1.0.0",
        },
      ]);

      await resolutionService.setShouldDisableUltraWidescreen();

      sinon.assert.calledWith(mockInstructionService.stubs.execute, [
        {
          action: InstructionAction.DISABLE_ULTRA_WIDESCREEN,
          version: "1.0.0",
        },
      ]);
    });

    it("should not set the value if the instruction service doesn't have the value", async () => {
      mockInstructionService.stubs.getInstructions.returns([
        {
          action: InstructionAction.DISABLE_PLUGIN,
          version: "1.0.0",
          plugin: "test-plugin",
          target: "test-target",
          type: InstructionType.ENB,
        },
      ]);

      await resolutionService.setShouldDisableUltraWidescreen();

      sinon.assert.calledWith(mockInstructionService.stubs.execute, []);
    });
  });

  describe("isUnsupportedResolution", () => {
    it("should return true if the resolution is ultra-widescreen and it is disabled", async () => {
      mockInstructionService.stubs.getInstructions.returns([]);
      mockInstructionService.stubs.execute.resolves(true);

      // this sets if the ultra-widescreen is disabled
      await resolutionService.setShouldDisableUltraWidescreen();

      expect(
        await resolutionService.isUnsupportedResolution({
          width: 3840,
          height: 1080,
        })
      ).to.equal(true);
    });

    it("should return false if the resolution is not ultra-widescreen", async () => {
      mockInstructionService.stubs.getInstructions.returns([]);
      mockInstructionService.stubs.execute.resolves(true);

      // this sets if the ultra-widescreen is disabled
      await resolutionService.setShouldDisableUltraWidescreen();

      expect(
        await resolutionService.isUnsupportedResolution({
          width: 1920,
          height: 1080,
        })
      ).to.equal(false);
    });

    it("should return false if the resolution is ultra-widescreen and it is not disabled", async () => {
      mockInstructionService.stubs.getInstructions.returns([]);
      mockInstructionService.stubs.execute.resolves(false);

      // this sets if the ultra-widescreen is disabled
      await resolutionService.setShouldDisableUltraWidescreen();

      expect(
        await resolutionService.isUnsupportedResolution({
          width: 3840,
          height: 1080,
        })
      ).to.equal(false);
    });

    it("should return false if the resolution is not ultra-widescreen and it is disabled", async () => {
      mockInstructionService.stubs.getInstructions.returns([]);
      mockInstructionService.stubs.execute.resolves(false);

      // this sets if the ultra-widescreen is disabled
      await resolutionService.setShouldDisableUltraWidescreen();

      expect(
        await resolutionService.isUnsupportedResolution({
          width: 1920,
          height: 1080,
        })
      ).to.equal(false);
    });

    describe("getCurrentResolution", () => {
      it("should get the current resolution multiplied by the scale factor", async () => {
        getPrimaryDisplayStub.returns({
          ...primaryDisplayMockReturn,
          size: {
            width: 1920,
            height: 1080,
          },
          scaleFactor: 1.5,
        });

        expect(resolutionService.getCurrentResolution()).to.deepEqual({
          width: 2880,
          height: 1620,
        });
      });
    });
  });

  describe("getResolutionPreference", () => {
    it("should return the resolution preference", async () => {
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.RESOLUTION)
        .returns({
          width: 1920,
          height: 1080,
        });

      expect(resolutionService.getResolutionPreference()).to.deepEqual({
        width: 1920,
        height: 1080,
      });
    });
  });

  describe("setResolution", () => {
    beforeEach(() => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);

      mockFs({
        [`${modDirectory}/mods/Wildlander/SKSE/Plugins`]: {
          "SSEDisplayTweaks.ini": stringify({
            Render: {
              Fullscreen: false,
              Borderless: true,
              BorderlessUpscale: true,
              Resolution: "3840x2160",
            },
          }),
        },
      });

      mockInstructionService.stubs.getInstructions.returns([]);

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.RESOLUTION)
        .returns({
          width: 1920,
          height: 1080,
        });
    });

    it("should set the resolution preference", async () => {
      await resolutionService.setResolution({
        width: 1920,
        height: 1080,
      });

      sinon.assert.calledWith(
        mockConfigService.stubs.setPreference,
        USER_PREFERENCE_KEYS.RESOLUTION,
        {
          width: 1920,
          height: 1080,
        }
      );
    });

    it("should set the graphics in graphics settings file", async () => {
      await resolutionService.setResolution({
        width: 1920,
        height: 1080,
      });

      expect(
        await fs.readFile(
          "mod/directory/mods/Wildlander/SKSE/Plugins/SSEDisplayTweaks.ini",
          "utf8"
        )
      ).to.equal(
        stringify({
          Render: {
            Fullscreen: false,
            Borderless: true,
            BorderlessUpscale: true,
            Resolution: "1920x1080",
          },
        }).trim()
      );
    });

    it("should run the instruction service with the instructions and closest ratio", async () => {
      mockInstructionService.stubs.getInstructions.returns([
        {
          action: InstructionAction.DISABLE_MOD,
          version: "1.0.0",
          target: "test-mod",
          mod: "test-mod",
          type: InstructionType.RESOLUTION_RATIO,
        },
      ]);

      await resolutionService.setResolution({
        width: 1920,
        height: 1080,
      });

      sinon.assert.calledWith(
        mockInstructionService.stubs.execute,
        [
          {
            action: InstructionAction.DISABLE_MOD,
            version: "1.0.0",
            target: "test-mod",
            mod: "test-mod",
            type: InstructionType.RESOLUTION_RATIO,
          },
        ],
        "16:9"
      );
    });
  });

  describe("getSupportedResolutions", () => {
    let platformStub: sinon.SinonStub;
    beforeEach(() => {
      platformStub = sinon.stub(os, "platform").returns("win32");
    });

    it("should return the supported resolutions and remove duplicates", async () => {
      mockChildProcess.stubs.exec.resolves({
        stdout: [
          "copyright info",
          "version info",
          "1920x1080, 32 bits @ 60 Hz",
          "2560x1440, 32 bits @ 60 Hz",
          "2560x1440, 32 bits @ 120 Hz",
          "",
          "3840x2160, 32 bits @ 60 Hz",
        ].join(os.EOL),
      });

      expect(await resolutionService.getSupportedResolutions()).to.deepEqual([
        { width: 1920, height: 1080 },
        { width: 2560, height: 1440 },
        { width: 3840, height: 2160 },
      ]);
    });

    it("should throw an error if exec throws an error", async () => {
      mockChildProcess.stubs.exec.rejects(new Error("test reject error"));

      await expect(resolutionService.getSupportedResolutions()).to.rejectedWith(
        "test reject error"
      );
    });

    it("should just return a hardcoded set of resolutions with the current resolution at the top on non-windows OSs", async () => {
      platformStub.returns("linux");

      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: {
          width: 1920,
          height: 1080,
        },
      });

      expect(await resolutionService.getSupportedResolutions()).to.deepEqual([
        { width: 1920, height: 1080 },
        { width: 7680, height: 4320 },
        { width: 3840, height: 1080 },
        { width: 3440, height: 1440 },
        { width: 1280, height: 800 },
      ]);
    });

    it("should throw an error if there is any stderr", async () => {
      mockChildProcess.stubs.exec.resolves({
        stderr: "test stderr",
      });

      await expect(resolutionService.getSupportedResolutions()).to.rejectedWith(
        "test stderr"
      );
    });
  });

  describe("sortResolutions", () => {
    it("should be a positive number if the second resolution is greater", async () => {
      expect(
        resolutionService.sortResolutions(
          { width: 1920, height: 1080 },
          { width: 3840, height: 2160 }
        )
      ).to.be.greaterThan(0);
    });

    it("should return a negative number if the second resolution is smaller", async () => {
      expect(
        resolutionService.sortResolutions(
          { width: 3840, height: 2160 },
          { width: 1920, height: 1080 }
        )
      ).to.be.lessThan(0);
    });

    it("should return a positive number if the widths are the same but second height is greater", async () => {
      expect(
        resolutionService.sortResolutions(
          { width: 1920, height: 1080 },
          { width: 1920, height: 2160 }
        )
      ).to.be.greaterThan(0);
    });

    it("should return a negative number if the widths are the same but second height is smaller", async () => {
      expect(
        resolutionService.sortResolutions(
          { width: 1920, height: 2160 },
          { width: 1920, height: 1080 }
        )
      ).to.be.lessThan(0);
    });
  });

  describe("resolutionsContain", () => {
    it("should return true if the resolutions contain the resolution", async () => {
      expect(
        resolutionService.resolutionsContain(
          [
            { width: 1920, height: 1080 },
            { width: 2560, height: 1440 },
          ],
          { width: 1920, height: 1080 }
        )
      ).to.equal(true);
    });

    it("should return false if the resolutions do not contain the resolution", async () => {
      expect(
        resolutionService.resolutionsContain(
          [
            { width: 1920, height: 1080 },
            { width: 2560, height: 1440 },
          ],
          { width: 3840, height: 2160 }
        )
      ).to.equal(false);
    });
  });

  describe("getResolutions", () => {
    beforeEach(() => {
      mockChildProcess.stubs.exec.resolves({
        stdout: [
          "copyright info",
          "version info",
          "1920x1080, 32 bits @ 60 Hz",
          "2560x1440, 32 bits @ 60 Hz",
          "3840x2160, 32 bits @ 60 Hz",
        ].join(os.EOL),
      });

      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: {
          width: 1920,
          height: 1080,
        },
        scaleFactor: 1,
      });

      sinon.stub(os, "platform").returns("win32");
    });

    it("should get the resolutions from the cache if it exists", async () => {
      await resolutionService.getResolutions();

      mockChildProcess.stubs.exec.resolves("");

      expect(await resolutionService.getResolutions()).to.deepEqual([
        { width: 3840, height: 2160 },
        { width: 2560, height: 1440 },
        { width: 1920, height: 1080 },
      ]);

      sinon.assert.calledOnce(mockChildProcess.stubs.exec);
    });

    it("should return the resolutions", async () => {
      expect(await resolutionService.getResolutions()).to.deepEqual([
        { width: 3840, height: 2160 },
        { width: 2560, height: 1440 },
        { width: 1920, height: 1080 },
      ]);
    });

    it("should add the current resolution if it isn't in the list", async () => {
      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: {
          width: 1920,
          height: 2160,
        },
        scaleFactor: 1,
      });

      expect(await resolutionService.getResolutions()).to.deepEqual([
        { width: 3840, height: 2160 },
        { width: 2560, height: 1440 },
        { width: 1920, height: 2160 },
        { width: 1920, height: 1080 },
      ]);
    });

    it("should maintain the users manually edited resolution", async () => {
      mockConfigService.stubs.hasPreference
        .withArgs(USER_PREFERENCE_KEYS.RESOLUTION)
        .returns(true);
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.RESOLUTION)
        .returns({
          width: 1111,
          height: 2222,
        });

      expect(await resolutionService.getResolutions()).to.deepEqual([
        { width: 3840, height: 2160 },
        { width: 2560, height: 1440 },
        { width: 1920, height: 1080 },
        { width: 1111, height: 2222 },
      ]);
    });
  });

  describe("shouldEnableBorderlessUpscale", () => {
    it("should enable borderless upscale if the monitor is not ultra-widescreen and non-ultra-widescreen is selected", async () => {
      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: { width: 1920, height: 1080 },
      });

      expect(
        resolutionService.shouldEnableBorderlessUpscale({
          width: 7680,
          height: 4320,
        })
      ).to.equal(true);
    });

    it("should disable borderless upscale if the monitor is not ultra-widescreen and ultra-widescreen is selected", async () => {
      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: { width: 1920, height: 1080 },
      });

      expect(
        resolutionService.shouldEnableBorderlessUpscale({
          width: 3440,
          height: 1440,
        })
      ).to.equal(false);
    });

    it("should disable borderless upscale if the monitor is ultra-widescreen and non-ultra-widescreen is selected", async () => {
      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: { width: 3440, height: 1440 },
      });

      expect(
        resolutionService.shouldEnableBorderlessUpscale({
          width: 7680,
          height: 4320,
        })
      ).to.equal(false);
    });

    it("should enable borderless upscale if the monitor is ultra-widescreen and ultra-widescreen is selected", async () => {
      getPrimaryDisplayStub.returns({
        ...primaryDisplayMockReturn,
        size: { width: 3440, height: 1440 },
      });

      expect(
        resolutionService.shouldEnableBorderlessUpscale({
          width: 3440,
          height: 1440,
        })
      ).to.equal(true);
    });
  });

  describe("setResolutionInGraphicsSettings", () => {
    let graphicsPath: string;

    beforeEach(() => {
      const modDirectory = "mod/directory";
      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.MOD_DIRECTORY)
        .returns(modDirectory);

      graphicsPath = `${modDirectory}/mods/Wildlander/SKSE/Plugins/SSEDisplayTweaks.ini`;

      mockFs({
        [graphicsPath]: stringify({
          Render: {
            Fullscreen: false,
            Borderless: true,
            BorderlessUpscale: true,
            Resolution: "3840x2160",
          },
        }),
      });

      mockConfigService.stubs.getPreference
        .withArgs(USER_PREFERENCE_KEYS.RESOLUTION)
        .returns({
          width: 1920,
          height: 1080,
        });
    });

    it("should set the graphics settings in the graphics file", async () => {
      await resolutionService.setResolutionInGraphicsSettings();

      expect(parse(await fs.readFile(graphicsPath, "utf-8"))).to.containDeep({
        Render: {
          Fullscreen: false,
          Borderless: true,
          BorderlessUpscale: true,
          Resolution: "1920x1080",
        },
      });
    });
  });
});
