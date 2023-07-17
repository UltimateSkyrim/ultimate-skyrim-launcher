import { controller, handle } from "@/main/decorators/controller.decorator";
import { ENB_EVENTS } from "@/main/controllers/enb/enb.events";
import { EnbService } from "@/main/services/enb.service";
import { service } from "@loopback/core";
import type { FriendlyDirectoryMap } from "@/shared/types/modpack-metadata";

@controller
export class EnbController {
  constructor(@service(EnbService) private enbService: EnbService) {}

  @handle(ENB_EVENTS.GET_ENB_PRESETS)
  getEnbPresets(): Promise<FriendlyDirectoryMap[]> {
    return this.enbService.getEnbPresets();
  }

  @handle(ENB_EVENTS.RESTORE_ENB_PRESETS)
  async restoreEnbPresets(): Promise<void> {
    await this.enbService.restoreEnbPresets();
  }

  @handle(ENB_EVENTS.GET_ENB_PREFERENCE)
  async getEnbPreference(): Promise<unknown> {
    return this.enbService.getEnbPreference();
  }

  @handle(ENB_EVENTS.SET_ENB_PREFERENCE)
  async setEnbPreference(enb: unknown): Promise<void> {
    if (typeof enb !== "string") {
      throw new Error(`ENB is not a string: ${enb}`);
    }
    await this.enbService.setEnb(enb);
  }
}
