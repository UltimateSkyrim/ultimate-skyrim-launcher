import { controller, handle } from "@/main/decorators/controller.decorator";
import { WindowService } from "@/main/services/window.service";
import { service } from "@loopback/core";
import { WINDOW_EVENTS } from "@/main/controllers/window/window.events";

@controller
export class WindowController {
  constructor(@service(WindowService) private renderService: WindowService) {}

  @handle(WINDOW_EVENTS.CLOSE)
  quit() {
    this.renderService.quit();
  }

  @handle(WINDOW_EVENTS.RELOAD)
  reload() {
    this.renderService.reload();
  }

  @handle(WINDOW_EVENTS.MINIMIZE)
  minimize() {
    this.renderService.minimize();
  }
}
