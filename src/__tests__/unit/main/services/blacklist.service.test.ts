import { createStubInstance, expect } from "@loopback/testlab";
import { SystemService } from "@/main/services/system.service";
import { BlacklistService } from "@/main/services/blacklist.service";

describe("Blacklist service", () => {
  it("should return a list of blacklisted processes running", async () => {
    const mockSystemService = createStubInstance(SystemService);

    mockSystemService.stubs.isProcessRunning.resolves(false);
    mockSystemService.stubs.isProcessRunning
      .withArgs("WRCoreService.x64.exe")
      .resolves(true);

    const blacklistService = new BlacklistService(mockSystemService);

    expect(await blacklistService.blacklistedProcessesRunning()).to.eql([
      {
        name: "WebRoot Antivirus",
        processName: "WRCoreService.x64.exe",
        running: true,
      },
    ]);
  });
});
