import { BindingScope, inject, injectable } from "@loopback/context";
import { Logger, LoggerBinding } from "@/main/logger";
import { Dialog, DialogProvider } from "./dialog.service";
import { service } from "@loopback/core";

@injectable({
  scope: BindingScope.SINGLETON,
})
export class ErrorService {
  constructor(
    @inject(LoggerBinding) private logger: Logger,
    @service(DialogProvider) private dialog: Dialog
  ) {}

  handleError(title: string, message: string) {
    this.logger.error(`${title}: ${message}`);
    this.logger.error(new Error().stack);
    this.dialog.showErrorBox(title, message);
  }

  handleUnknownError(error?: unknown) {
    this.logger.error(
      `Unknown error. The stack trace might hold more details. ${error}`
    );
    this.logger.error(new Error().stack);
    this.dialog.showErrorBox(
      "An unknown error has occurred",
      "If you require more support, please post a message in the official modpack Discord and send your launcher log files."
    );
  }
}
