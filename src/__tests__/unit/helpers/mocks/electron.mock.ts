import type Electron from "electron";
import sinon from "sinon";

export const getMockElectron = () => {
  const getAllWindows = sinon.stub();
  const mockElectron = {
    app: {
      quit: sinon.stub(),
    },
    getAllWindows,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    BrowserWindow: sinon.stub().returns({
      getAllWindows,
    }),
  };

  return {
    ...(mockElectron as unknown as typeof Electron),
    stubs: mockElectron as typeof mockElectron,
  };
};
