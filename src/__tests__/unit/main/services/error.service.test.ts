import { ErrorService } from "@/main/services/error.service";
import type { ElectronLog } from "electron-log";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";
import { getMockDialog } from "@/__tests__/unit/helpers/mocks/dialog.mock";
import { sinon, StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import type { Dialog } from "electron";

describe("Error Service", () => {
  let errorService: ErrorService;
  let mockLogger: sinon.SinonStubbedInstance<ElectronLog>;
  let mockDialog: StubbedInstanceWithSinonAccessor<Dialog>;

  beforeEach(() => {
    mockLogger = getMockLogger();
    mockDialog = getMockDialog();

    errorService = new ErrorService(mockLogger, mockDialog);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle normal errors", async () => {
    errorService.handleError("title", "message");
    sinon.assert.calledWith(mockDialog.stubs.showErrorBox, "title", "message");
  });

  it("should handle unknown errors", async () => {
    errorService.handleUnknownError();
    sinon.assert.calledWith(
      mockDialog.stubs.showErrorBox,
      "An unknown error has occurred",
      "If you require more support, please post a message in the official modpack Discord and send your launcher log files."
    );
  });
});
