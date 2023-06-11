import { controller, handle } from "@/main/decorators/controller.decorator";
import { DIALOG_EVENTS } from "@/main/controllers/dialog/dialog.events";
import { service } from "@loopback/core";
import { ErrorService } from "@/main/services/error.service";
import { dialog } from "electron";

@controller
export class DialogController {
  constructor(@service(ErrorService) private errorService: ErrorService) {}

  @handle(DIALOG_EVENTS.ERROR)
  async error({ title, error }: { title: string; error: string }) {
    this.errorService.handleError(title, error);
  }

  @handle(DIALOG_EVENTS.CONFIRMATION)
  async confirmation({
    message,
    buttons,
  }: {
    message: string;
    buttons: string[];
  }) {
    return dialog.showMessageBox({ message, buttons });
  }

  @handle(DIALOG_EVENTS.DIRECTORY_SELECT)
  directorySelect() {
    return dialog.showOpenDialog({ properties: ["openDirectory"] });
  }
}
