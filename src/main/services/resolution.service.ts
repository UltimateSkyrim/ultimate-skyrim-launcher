import * as os from "os";
import { promisify } from "util";
import childProcess from "child_process";
import { ConfigService, isDevelopment } from "@/main/services/config.service";
import { IIniObjectSection, parse, stringify } from "js-ini";
import fs from "fs";
import { screen } from "electron";
import { USER_PREFERENCE_KEYS } from "@/shared/enums/userPreferenceKeys";
import type { Resolution } from "@/Resolution";
import { BindingScope, inject, injectable } from "@loopback/context";
import { service } from "@loopback/core";
import { name as modpackName } from "@/main/wildlander/modpack.json";
import { InstructionService } from "@/main/services/instruction.service";
import { Logger, LoggerBinding } from "@/main/logger";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class ResolutionService {
  private resolutionsCache!: Resolution[];
  private ultraWidescreenDisabled: boolean | undefined;

  constructor(
    @service(ConfigService) private configService: ConfigService,
    @service(InstructionService)
    private instructionsService: InstructionService,
    @inject(LoggerBinding) private logger: Logger
  ) {}

  getResourcePath() {
    return isDevelopment
      ? `${process.cwd()}/src/assets`
      : process.resourcesPath;
  }

  isUltraWidescreen({ width, height }: Resolution) {
    // Anything above this is an ultra widescreen resolution.
    // Most 16:9 resolutions are 1.7777777777777777.
    // There are some legacy resolutions that aren't quite 16:9.
    return width / height > 1.78;
  }

  getSupportedRatios() {
    return [
      {
        key: "16:9",
        value: 16 / 9,
      },
      {
        key: "21:9",
        value: 21 / 9,
      },
      {
        key: "32:9",
        value: 32 / 9,
      },
    ];
  }

  getClosestSupportedRatio({ width, height }: Resolution) {
    const supportedRatios = this.getSupportedRatios();
    const ratio = width / height;

    const closestValue = supportedRatios
      .map((x) => x.value)
      .reduce((prev, curr) =>
        Math.abs(curr - ratio) < Math.abs(prev - ratio) ? curr : prev
      );
    const closestRatio = supportedRatios.find(
      (x) => x.value === closestValue
    )?.key;
    this.logger.debug(
      `Found closest ratio for ${width}x${height}: ${closestRatio}`
    );
    return closestRatio;
  }

  public async setShouldDisableUltraWidescreen() {
    const instructions = this.instructionsService
      .getInstructions()
      .filter((x) => x.action === "disable-ultra-widescreen");
    this.ultraWidescreenDisabled =
      (await this.instructionsService.execute(instructions)) ?? false;
    this.logger.debug(
      `Ultra-widescreen disabled: ${this.ultraWidescreenDisabled}`
    );
  }

  async isUnsupportedResolution(resolution: Resolution) {
    return this.ultraWidescreenDisabled && this.isUltraWidescreen(resolution);
  }

  getCurrentResolution(): Resolution {
    const {
      size: { height, width },
      scaleFactor,
    } = screen.getPrimaryDisplay();
    return {
      width: width * scaleFactor,
      height: height * scaleFactor,
    };
  }

  getResolutionPreference() {
    return this.configService.getPreference<Resolution>(
      USER_PREFERENCE_KEYS.RESOLUTION
    );
  }

  hasResolutionPreference() {
    return this.configService.hasPreference(USER_PREFERENCE_KEYS.RESOLUTION);
  }

  async setResolution(resolution: Resolution) {
    this.configService.setPreference(
      USER_PREFERENCE_KEYS.RESOLUTION,
      resolution
    );
    await this.setResolutionInGraphicsSettings();
    return this.postSetResolution(resolution);
  }

  postSetResolution(resolution: Resolution) {
    const resolutionInstructions = this.getResolutionInstructions();
    const closestRatio = this.getClosestSupportedRatio(resolution);
    return this.instructionsService.execute(
      resolutionInstructions,
      closestRatio
    );
  }

  getResolutionInstructions() {
    return this.instructionsService
      .getInstructions()
      .filter((instruction) => instruction.type === "resolution-ratio");
  }

  async getSupportedResolutions() {
    const { stdout: resolutionOutput, stderr } = await promisify(
      childProcess.exec
    )(`"${this.getResourcePath()}/tools/QRes.exe" /L`);
    if (stderr) {
      this.logger.error(`Error getting resolutions ${stderr}`);
      throw new Error(stderr);
    }

    return (
      resolutionOutput
        /**
         * QRes.exe outputs resolutions in the format:
         * 640x480, 32 bits @ 60 Hz.
         * 720x480, 32 bits @ 60 Hz.
         */
        .split(/\r*\n/)
        // The first 2 items in the array will contain copyright and version information
        .slice(2)
        // Remove empty entries
        .filter((resolution) => resolution !== "")
        // Only save the resolution
        .map((resolution) => resolution.split(",")[0] as string)
    );
  }

  sortResolutions(resolution: Resolution, previousResolution: Resolution) {
    return (
      previousResolution.width - resolution.width ||
      previousResolution.height - resolution.height
    );
  }

  resolutionsContain(resolutions: Resolution[], resolution: Resolution) {
    return resolutions.some(
      ({ width, height }) =>
        resolution.height === height && resolution.width === width
    );
  }

  async getResolutions(): Promise<Resolution[]> {
    this.logger.debug("Getting resolutions");

    if (this.resolutionsCache) {
      this.logger.debug(
        `Resolutions cached ${JSON.stringify(this.resolutionsCache)}`
      );
      return this.resolutionsCache;
    }

    const currentResolution = this.getCurrentResolution();

    // The application is only supported on Windows machines.
    // However, development is supported on other OSs so just return the current resolution
    // Also, return an ultrawide resolution for testing
    if (os.platform() !== "win32") {
      return [
        { width: 7680, height: 4320 }, // 16:9
        currentResolution,
        { width: 3840, height: 1080 }, // Ultra widescreen (32:9)
        { width: 3440, height: 1440 }, // Ultra widescreen (21:9)
        { width: 1920, height: 1080 }, // 16:9
        { width: 1280, height: 800 }, // 16:10
      ];
    } else {
      const resolutions = [...new Set(await this.getSupportedResolutions())]
        // Format the QRes output
        .map((resolution) => ({
          width: Number(resolution.split("x")[0]),
          height: Number(resolution.split("x")[1]),
        }));

      this.logger.debug(
        `Supported resolutions: ${JSON.stringify(resolutions)}`
      );

      // Sometimes, QRes.exe cannot recognise some resolutions.
      // As a safety measure, add the users current resolution if it wasn't detected.
      if (!this.resolutionsContain(resolutions, currentResolution)) {
        this.logger.debug(
          `Native resolution (${JSON.stringify(
            currentResolution
          )}) not found. Adding to the list.`
        );
        resolutions.push(currentResolution);
      }

      // If a user has manually edited the preferences, add that resolution too
      if (
        this.hasResolutionPreference() &&
        !this.resolutionsContain(resolutions, this.getResolutionPreference())
      ) {
        resolutions.push(this.getResolutionPreference());
      }

      const sortedResolutions = resolutions.sort(this.sortResolutions);

      this.logger.debug(
        `Resolutions: ${sortedResolutions.map(
          ({ width, height }) => `${width}x${height}`
        )}`
      );

      // Add resolutions to a cache to computing them later
      this.resolutionsCache = sortedResolutions;

      return sortedResolutions;
    }
  }

  skyrimGraphicsSettingsPath() {
    return `${this.configService.getPreference(
      USER_PREFERENCE_KEYS.MOD_DIRECTORY
    )}/mods/${modpackName}/SKSE/Plugins/SSEDisplayTweaks.ini`;
  }

  /**
   * Borderless upscale will need to be toggled depending on if the user is using an ultra-widescreen monitor.
   * Without upscale, users on ultra-widescreen but using a smaller resolution will get stretching
   * User has non-ultra-widescreen monitor resolution and selects non-ultra-widescreen resolution - Enable upscale
   * User has non-ultra-widescreen monitor resolution and selects ultra-widescreen resolution - Disable upscale
   * User has ultra-widescreen and selects non-ultra-widescreen resolution - Disable upscale
   * User has ultra-widescreen and selects ultra-widescreen resolution - Enable upscale
   */
  shouldEnableBorderlessUpscale(resolution: Resolution): boolean {
    const { width, height } = this.getCurrentResolution();

    const monitorIsUltraWidescreen = this.isUltraWidescreen({ width, height });
    const preferenceIsUltraWidescreen = this.isUltraWidescreen(resolution);
    let borderlessUpscale;
    if (!monitorIsUltraWidescreen && !preferenceIsUltraWidescreen) {
      borderlessUpscale = true;
    } else if (!monitorIsUltraWidescreen && preferenceIsUltraWidescreen) {
      borderlessUpscale = false;
    } else {
      borderlessUpscale = !(
        monitorIsUltraWidescreen && !preferenceIsUltraWidescreen
      );
    }

    this.logger.info(
      `Setting borderless upscale for ${width}x${height}: ${borderlessUpscale}`
    );
    return borderlessUpscale;
  }

  async setResolutionInGraphicsSettings() {
    const { width, height } = this.configService.getPreference(
      USER_PREFERENCE_KEYS.RESOLUTION
    ) as Resolution;

    this.logger.info(
      `Setting resolution in ${this.skyrimGraphicsSettingsPath()} to ${width} x ${height}`
    );
    const SkyrimGraphicSettings = parse(
      await fs.promises.readFile(this.skyrimGraphicsSettingsPath(), "utf-8"),
      { comment: "#" }
    ) as IIniObjectSection;

    (SkyrimGraphicSettings["Render"] as IIniObjectSection)[
      "Resolution"
    ] = `${width}x${height}`;

    // If the selected resolution is ultra-widescreen, don't upscale the image otherwise it gets stretched
    // If the selected resolution is ultra-widescreen, don't upscale the image otherwise it gets stretched
    (SkyrimGraphicSettings["Render"] as IIniObjectSection)[
      "BorderlessUpscale"
    ] = this.shouldEnableBorderlessUpscale({ width, height });

    await fs.promises.writeFile(
      this.skyrimGraphicsSettingsPath(),
      stringify(SkyrimGraphicSettings)
    );
  }
}
