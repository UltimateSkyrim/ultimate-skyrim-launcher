import { controller, handle } from "@/main/decorators/controller.decorator";
import { RESOLUTION_EVENTS } from "@/main/controllers/resolution/resolution.events";
import { ResolutionService } from "@/main/services/resolution.service";
import { service } from "@loopback/core";
import type { Resolution } from "@/Resolution";

@controller
export class ResolutionController {
  constructor(
    @service(ResolutionService) private resolutionService: ResolutionService
  ) {}

  @handle(RESOLUTION_EVENTS.GET_RESOLUTION_PREFERENCE)
  getResolutionPreference() {
    return this.resolutionService.getResolutionPreference();
  }

  @handle(RESOLUTION_EVENTS.SET_RESOLUTION_PREFERENCE)
  setResolutionPreference(resolution: Resolution) {
    return this.resolutionService.setResolution(resolution);
  }

  @handle(RESOLUTION_EVENTS.GET_RESOLUTIONS)
  getResolutions() {
    return this.resolutionService.getResolutions();
  }

  @handle(RESOLUTION_EVENTS.IS_UNSUPPORTED_RESOLUTION)
  isUnsupportedResolution(resolution: Resolution) {
    return this.resolutionService.isUnsupportedResolution(resolution);
  }
}
