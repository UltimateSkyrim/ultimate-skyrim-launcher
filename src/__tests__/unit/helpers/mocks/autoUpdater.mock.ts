import { sinon, StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import type { AppUpdater } from "electron-updater";

/**
 * Electron's auto updater doesn't exist in a testing environment.
 * So, it needs to be manually stubbed.
 */
export const getAutoUpdaterMock =
  (): StubbedInstanceWithSinonAccessor<AppUpdater> => {
    const mockAutoUpdater = {
      on: sinon.stub<Parameters<AppUpdater["on"]>>(),
      quitAndInstall: sinon.stub<Parameters<AppUpdater["quitAndInstall"]>>(),
      checkForUpdates: sinon.stub<Parameters<AppUpdater["checkForUpdates"]>>(),
    } as unknown as AppUpdater;

    return {
      ...mockAutoUpdater,
      stubs: mockAutoUpdater as sinon.SinonStubbedInstance<AppUpdater>,
    } as StubbedInstanceWithSinonAccessor<AppUpdater>;
  };
