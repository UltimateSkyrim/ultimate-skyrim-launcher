import { SystemService } from "@/main/services/system.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { ConfigService } from "@/main/services/config.service";
import { ErrorService } from "@/main/services/error.service";
import type psList from "ps-list";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";

describe("System service", () => {
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;

  let systemService: SystemService;

  beforeEach(() => {
    mockConfigService = createStubInstance(ConfigService);
    mockErrorService = createStubInstance(ErrorService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return true if a process is running", async () => {
    const mockListProcess = () =>
      new Promise<psList.ProcessDescriptor[]>((resolve) =>
        resolve([{ name: "mockname.exe", pid: 1234, ppid: 1234 }])
      );
    systemService = new SystemService(
      mockConfigService,
      mockErrorService,
      getMockLogger(),
      mockListProcess
    );

    expect(await systemService.isProcessRunning("mockname.exe")).to.eql(true);
  });

  it("should return false if a process is not running", async () => {
    const mockListProcess = () =>
      new Promise<psList.ProcessDescriptor[]>((resolve) =>
        resolve([{ name: "mockname.exe", pid: 1234, ppid: 1234 }])
      );
    systemService = new SystemService(
      mockConfigService,
      mockErrorService,
      getMockLogger(),
      mockListProcess
    );

    expect(await systemService.isProcessRunning("notrunning.exe")).to.eql(
      false
    );
  });
});
