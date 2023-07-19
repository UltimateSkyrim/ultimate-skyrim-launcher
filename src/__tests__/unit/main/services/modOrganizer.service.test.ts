import { ModOrganizerService } from "@/main/services/modOrganizer.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { EnbService } from "@/main/services/enb.service";
import { ErrorService } from "@/main/services/error.service";
import { ConfigService } from "@/main/services/config.service";
import { ResolutionService } from "@/main/services/resolution.service";
import { GameService } from "@/main/services/game.service";
import { ProfileService } from "@/main/services/profile.service";
import { SystemService } from "@/main/services/system.service";
import { GraphicsService } from "@/main/services/graphics.service";
import mockFs from "mock-fs";
import { getMockLogger } from "@/__tests__/unit/helpers/logger.mock";
import { MO2_NAMES } from "@/shared/enums/mo2";

describe("ModOrganizer service", () => {
  let mockEnbService: StubbedInstanceWithSinonAccessor<EnbService>;
  let mockErrorService: StubbedInstanceWithSinonAccessor<ErrorService>;
  let mockConfigService: StubbedInstanceWithSinonAccessor<ConfigService>;
  let mockResolutionService: StubbedInstanceWithSinonAccessor<ResolutionService>;
  let mockGameService: StubbedInstanceWithSinonAccessor<GameService>;
  let mockProfileService: StubbedInstanceWithSinonAccessor<ProfileService>;
  let mockSystemService: StubbedInstanceWithSinonAccessor<SystemService>;
  let mockGraphicsService: StubbedInstanceWithSinonAccessor<GraphicsService>;

  let modOrganizerService: ModOrganizerService;

  beforeEach(() => {
    mockEnbService = createStubInstance(EnbService);
    mockErrorService = createStubInstance(ErrorService);
    mockConfigService = createStubInstance(ConfigService);
    mockResolutionService = createStubInstance(ResolutionService);
    mockGameService = createStubInstance(GameService);
    mockProfileService = createStubInstance(ProfileService);
    mockSystemService = createStubInstance(SystemService);
    mockGraphicsService = createStubInstance(GraphicsService);
  });

  afterEach(() => {
    mockFs.restore();
    sinon.restore();
  });

  it("should determine if Mod Organizer is running", async () => {
    mockSystemService.stubs.isProcessRunning
      .withArgs(MO2_NAMES.MO2EXE)
      .resolves(true);

    modOrganizerService = new ModOrganizerService(
      mockEnbService,
      mockErrorService,
      mockConfigService,
      mockResolutionService,
      mockGameService,
      mockProfileService,
      mockSystemService,
      mockGraphicsService,
      getMockLogger()
    );

    expect(await modOrganizerService.isRunning()).to.eql(true);
  });

  it("should get the first binary", async () => {
    const mockModDirectory = "mock/mod/directory";

    mockFs({
      [mockModDirectory]: {
        [MO2_NAMES.MO2Settings]: `
        [customExecutables]
        size=1
        1\\binary=mock/first/custom/executable.exe
        1\\title=SKSE
        `,
      },
    });

    mockConfigService.stubs.modDirectory.returns(mockModDirectory);

    modOrganizerService = new ModOrganizerService(
      mockEnbService,
      mockErrorService,
      mockConfigService,
      mockResolutionService,
      mockGameService,
      mockProfileService,
      mockSystemService,
      mockGraphicsService,
      getMockLogger()
    );

    expect(await modOrganizerService.getFirstCustomExecutableTitle()).to.eql(
      "SKSE"
    );
  });
});
