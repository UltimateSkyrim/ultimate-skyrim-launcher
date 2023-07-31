import type { Dialog } from "electron";
import { sinon, StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import type {
  OverloadParameters,
  OverloadReturnType,
} from "@/shared/types/overloads";

/**
 * Electron's dialog doesn't exist in a testing environment.
 * So, it needs to be manually stubbed.
 */
export const getMockDialog = (): StubbedInstanceWithSinonAccessor<Dialog> => {
  const mockDialog: Dialog = {
    showCertificateTrustDialog: sinon.stub<
      OverloadParameters<Dialog["showCertificateTrustDialog"]>,
      OverloadReturnType<Dialog["showCertificateTrustDialog"]>
    >(),
    showErrorBox: sinon.stub<
      OverloadParameters<Dialog["showErrorBox"]>,
      OverloadReturnType<Dialog["showErrorBox"]>
    >(),
    showMessageBox: sinon.stub<
      OverloadParameters<Dialog["showMessageBox"]>,
      OverloadReturnType<Dialog["showMessageBox"]>
    >(),
    showMessageBoxSync: sinon.stub<
      OverloadParameters<Dialog["showMessageBoxSync"]>,
      OverloadReturnType<Dialog["showMessageBoxSync"]>
    >(),
    showOpenDialog: sinon.stub<
      OverloadParameters<Dialog["showOpenDialog"]>,
      OverloadReturnType<Dialog["showOpenDialog"]>
    >(),
    showOpenDialogSync: sinon.stub<
      OverloadParameters<Dialog["showOpenDialogSync"]>,
      OverloadReturnType<Dialog["showOpenDialogSync"]>
    >(),
    showSaveDialog: sinon.stub<
      OverloadParameters<Dialog["showSaveDialog"]>,
      OverloadReturnType<Dialog["showSaveDialog"]>
    >(),
    showSaveDialogSync: sinon.stub<
      OverloadParameters<Dialog["showSaveDialogSync"]>,
      OverloadReturnType<Dialog["showSaveDialogSync"]>
    >(),
  };

  return Object.assign(mockDialog as Dialog, {
    stubs: mockDialog as sinon.SinonStubbedInstance<Dialog>,
  });
};
