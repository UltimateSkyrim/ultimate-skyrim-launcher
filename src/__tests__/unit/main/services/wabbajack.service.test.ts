import mockFs from "mock-fs";
import { WabbajackService } from "@/main/services/wabbajack.service";
import { SystemService } from "@/main/services/system.service";
import { ModpackService } from "@/main/services/modpack.service";
import {
  createStubInstance,
  expect,
  sinon,
  StubbedInstanceWithSinonAccessor,
} from "@loopback/testlab";
import { getMockLogger } from "@/__tests__/unit/helpers/mocks/logger.mock";

const mockLocalAppData = "mock/local/app/data";

const mockDate = new Date();

const getMockV2Wabbajack = () => {
  return {
    [`${mockLocalAppData}/Wabbajack/installed_modlists.json`]: JSON.stringify({
      "mock/install/location/3": {
        ModList: {
          Name: "Wildlander",
          Version: "1.1.9",
        },
        InstallationPath: "mock/install/location/3",
      },
      "mock/install/location/4": {
        ModList: {
          Name: "Wildlander",
          Version: "1.1.10",
        },
        InstallationPath: "mock/install/location/4",
      },
    }),
  };
};

const getMockV3Wabbajack = () => ({
  [`${mockLocalAppData}/Wabbajack/saved_settings`]: {
    "install-settings-asdfghj.json": mockFs.file({
      content: JSON.stringify({
        InstallLocation: "mock/install/location/1",
        Metadata: {
          title: "Wildlander",
          version: "1.1.9",
        },
      }),
      mtime: mockDate,
    }),
    "install-settings-lkjhgf.json": mockFs.file({
      content: JSON.stringify({
        InstallLocation: "mock/install/location/2",
        Metadata: {
          title: "Wildlander",
          version: "1.1.10",
        },
      }),
      mtime: mockDate,
    }),
    "another-setting.json": JSON.stringify({
      something: "else",
    }),
  },
});

describe("Wabbajack service", () => {
  let mockModpackService: StubbedInstanceWithSinonAccessor<ModpackService>;
  let wabbajackService: WabbajackService;

  beforeEach(() => {
    mockModpackService = createStubInstance(ModpackService);

    sinon.stub(SystemService, "getLocalAppData").returns(mockLocalAppData);

    wabbajackService = new WabbajackService(
      mockModpackService,
      getMockLogger()
    );
  });

  afterEach(() => {
    sinon.restore();
    mockFs.restore();
  });

  describe("getInstalledModpacks", () => {
    it("should combine modlist info from wabbajack v2 and v3", async () => {
      mockFs({ ...getMockV2Wabbajack(), ...getMockV3Wabbajack() });

      expect(await wabbajackService.getInstalledModpacks()).to.eql({
        ["mock/install/location/1"]: {
          title: "Wildlander",
          installPath: "mock/install/location/1",
          version: "1.1.9",
          lastUpdated: mockDate,
        },
        ["mock/install/location/2"]: {
          title: "Wildlander",
          installPath: "mock/install/location/2",
          version: "1.1.10",
          lastUpdated: mockDate,
        },
        ["mock/install/location/3"]: {
          title: "Wildlander",
          installPath: "mock/install/location/3",
          version: "1.1.9",
        },
        ["mock/install/location/4"]: {
          title: "Wildlander",
          installPath: "mock/install/location/4",
          version: "1.1.10",
        },
      });
    });

    it("should should return v2 modlists if only they are available", async () => {
      mockFs({ ...getMockV2Wabbajack() });

      expect(await wabbajackService.getInstalledModpacks()).to.eql({
        ["mock/install/location/3"]: {
          title: "Wildlander",
          installPath: "mock/install/location/3",
          version: "1.1.9",
        },
        ["mock/install/location/4"]: {
          title: "Wildlander",
          installPath: "mock/install/location/4",
          version: "1.1.10",
        },
      });
    });

    it("should should return v3 modlists if only they are available", async () => {
      mockFs({ ...getMockV3Wabbajack() });

      expect(await wabbajackService.getInstalledModpacks()).to.eql({
        ["mock/install/location/1"]: {
          title: "Wildlander",
          installPath: "mock/install/location/1",
          version: "1.1.9",
          lastUpdated: mockDate,
        },
        ["mock/install/location/2"]: {
          title: "Wildlander",
          installPath: "mock/install/location/2",
          version: "1.1.10",
          lastUpdated: mockDate,
        },
      });
    });

    it("should return only the latest v3 modpack for an install directory", async () => {
      const laterDate = new Date();
      const olderDate = new Date(new Date().setDate(-1));

      mockFs({
        [`${mockLocalAppData}/Wabbajack/saved_settings`]: {
          "install-settings-asdfghj.json": mockFs.file({
            content: JSON.stringify({
              InstallLocation: "mock/install/location/1",
              Metadata: {
                title: "Wildlander",
                version: "1.1.11",
              },
            }),
            mtime: laterDate,
          }),
          "install-settings-lksadfh.json": mockFs.file({
            content: JSON.stringify({
              InstallLocation: "mock/install/location/1",
              Metadata: {
                title: "Wildlander",
                version: "1.1.9",
              },
            }),
            mtime: olderDate,
          }),
          "another-setting.json": JSON.stringify({
            something: "else",
          }),
        },
      });

      expect(await wabbajackService.getInstalledModpacks()).to.eql({
        ["mock/install/location/1"]: {
          title: "Wildlander",
          installPath: "mock/install/location/1",
          version: "1.1.11",
          lastUpdated: laterDate,
        },
      });
    });

    it("should return null if there is no modlists available", async () => {
      mockFs({ [mockLocalAppData]: {} });
      expect(await wabbajackService.getInstalledModpacks()).to.eql(null);
    });
  });

  describe("getInstalledModpacksFromWabbajackV2", () => {
    it("should get all installed modpacks from wabbajack v2", async () => {
      mockFs(getMockV2Wabbajack());

      expect(
        await wabbajackService.getInstalledModpacksFromWabbajackV2()
      ).to.eql({
        ["mock/install/location/3"]: {
          title: "Wildlander",
          installPath: "mock/install/location/3",
          version: "1.1.9",
        },
        ["mock/install/location/4"]: {
          title: "Wildlander",
          installPath: "mock/install/location/4",
          version: "1.1.10",
        },
      });
    });
  });

  describe("getInstalledModpacksFromWabbajackV3", () => {
    it("should get installed modpacks from wabbajack v3", async () => {
      mockFs(getMockV3Wabbajack());

      expect(
        await wabbajackService.getInstalledModpacksFromWabbajackV3()
      ).to.eql({
        ["mock/install/location/1"]: {
          title: "Wildlander",
          installPath: "mock/install/location/1",
          version: "1.1.9",
          lastUpdated: mockDate,
        },
        ["mock/install/location/2"]: {
          title: "Wildlander",
          installPath: "mock/install/location/2",
          version: "1.1.10",
          lastUpdated: mockDate,
        },
      });
    });
  });
});
