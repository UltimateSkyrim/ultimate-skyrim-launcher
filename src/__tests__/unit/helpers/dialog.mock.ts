import type {
  BrowserWindow,
  CertificateTrustDialogOptions,
  Dialog,
  MessageBoxOptions,
  MessageBoxReturnValue,
  MessageBoxSyncOptions,
  OpenDialogOptions,
  OpenDialogReturnValue,
  OpenDialogSyncOptions,
  SaveDialogOptions,
  SaveDialogReturnValue,
} from "electron";
import { sinon, StubbedInstanceWithSinonAccessor } from "@loopback/testlab";

/**
 * Electron's dialog doesn't exist in a testing environment.
 * So, it needs to be manually stubbed.
 */
export const getMockDialog = (): StubbedInstanceWithSinonAccessor<Dialog> => {
  const mockDialog: Dialog = {
    showCertificateTrustDialog: sinon.stub<
      | [BrowserWindow, CertificateTrustDialogOptions]
      | [CertificateTrustDialogOptions],
      Promise<void>
    >(),
    showErrorBox: sinon.stub<[string, string], void>(),
    showMessageBox: sinon.stub<
      [BrowserWindow, MessageBoxOptions] | [MessageBoxOptions],
      Promise<MessageBoxReturnValue>
    >(),
    showMessageBoxSync: sinon.stub<
      [BrowserWindow, MessageBoxSyncOptions] | [MessageBoxSyncOptions],
      number
    >(),
    showOpenDialog: sinon.stub<
      [BrowserWindow, OpenDialogOptions] | [OpenDialogOptions],
      Promise<OpenDialogReturnValue>
    >(),
    showOpenDialogSync: sinon.stub<
      [BrowserWindow, OpenDialogSyncOptions] | [OpenDialogSyncOptions],
      string[] | undefined
    >(),
    showSaveDialog: sinon.stub<
      [BrowserWindow, SaveDialogOptions] | [SaveDialogOptions],
      Promise<SaveDialogReturnValue>
    >(),
    showSaveDialogSync: sinon.stub<
      [BrowserWindow, SaveDialogOptions] | [SaveDialogOptions],
      string | undefined
    >(),
  };

  return Object.assign(mockDialog as Dialog, {
    stubs: mockDialog as sinon.SinonStubbedInstance<Dialog>,
  });
};
