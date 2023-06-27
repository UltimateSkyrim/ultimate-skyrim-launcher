import fs from "fs";
import { removeSync } from "fs-extra";
import { stringify } from "js-ini";
import path from "path";

type DirectoryStructure = { [name: string]: string | DirectoryStructure };

const rootPath = path.resolve(`${__dirname}/../../mock-files`);
const modpackPath = `${rootPath}/mock-modpack-install`;
const appDataPath = `${rootPath}/local`;

const createDirectoryStructure = (
  directoryObject: DirectoryStructure,
  basePath = ""
): void => {
  fs.mkdirSync(basePath, { recursive: true });

  for (const [name, item] of Object.entries(directoryObject)) {
    const itemPath = `${basePath}/${name}`;
    if (typeof item === "object") {
      fs.mkdirSync(itemPath, { recursive: true });
      createDirectoryStructure(item, itemPath);
    } else {
      fs.writeFileSync(itemPath, item);
    }
  }
};

const ModOrganizerIni = stringify({
  General: {
    gameName: "Skyrim Special Edition",
    selected_profile: "@Byte_Array(0_Wildlander-STANDARD)",
  },
  Settings: {
    lock_gui: false,
  },
});

const namesENBIni = JSON.stringify([
  {
    real: "1_Shaders_ULTRA",
    friendly: "Ultra Shaders",
  },
  {
    real: "1_Shaders_HIGH",
    friendly: "High Shaders",
  },
  {
    real: "1_Shaders_LOW",
    friendly: "Low Shaders",
  },
]);

const namesMO2Ini = JSON.stringify([
  {
    real: "1_Wildlander-ULTRA",
    friendly: "Ultra Graphics",
  },
  {
    real: "1_Wildlander-HIGH",
    friendly: "High Graphics",
  },
  {
    real: "1_Wildlander-MEDIUM",
    friendly: "Medium Graphics",
  },
  {
    real: "1_Wildlander-LOW",
    friendly: "Low Graphics",
  },
  {
    real: "1_Wildlander-POTATO",
    friendly: "Potato Graphics",
  },
]);

const enbFiles = (content: string) => {
  return {
    enbseries: {
      mock1: {},
      mock2: {},
    },
    "d3d11.dll": "",
    "d3dcompiler_46e.dll": "",
    "enblocal.ini": content,
    "enbseries.ini": content,
    "ReShade.ini": content,
    "zangdar'ENB.ini": content,
  };
};

const SSEDisplayTweaks = stringify({
  Render: {
    Fullscreen: false,
    Borderless: true,
    BorderlessUpscale: true,
    Resolution: "3840x2160",
  },
});

const mockModpack: DirectoryStructure = {
  "ModOrganizer.exe": "",
  "ModOrganizer.ini": ModOrganizerIni,
  mods: {
    Wildlander: {
      SKSE: {
        Plugins: {
          "SSEDisplayTweaks.ini": SSEDisplayTweaks,
        },
      },
    },
  },
  profiles: {
    "1_Wildlander-ULTRA": {
      "modlist.txt": "",
      "plugins.txt": "",
      "Skyrim.ini": "",
      "SkyrimCustom.ini": "",
      "SkyrimPrefs.ini": "",
    },
    "1_Wildlander-HIGH": {
      "modlist.txt": "",
      "plugins.txt": "",
      "Skyrim.ini": "",
      "SkyrimCustom.ini": "",
      "SkyrimPrefs.ini": "",
    },
    "1_Wildlander-MEDIUM": {
      "modlist.txt": "",
      "plugins.txt": "",
      "Skyrim.ini": "",
      "SkyrimCustom.ini": "",
      "SkyrimPrefs.ini": "",
    },
    "1_Wildlander-LOW": {
      "modlist.txt": "",
      "plugins.txt": "",
      "Skyrim.ini": "",
      "SkyrimCustom.ini": "",
      "SkyrimPrefs.ini": "",
    },
    "1_Wildlander-POTATO": {
      "modlist.txt": "",
      "plugins.txt": "",
      "Skyrim.ini": "",
      "SkyrimCustom.ini": "",
      "SkyrimPrefs.ini": "",
    },
  },
  "Stock Game": {
    "SkyrimSE.exe": "",
    "SkyrimSELauncher.exe": "",
  },
  launcher: {
    "namesMO2.json": namesMO2Ini,
    "namesENB.json": namesENBIni,
    "ENB Presets": {
      "1_Shaders_ULTRA": enbFiles("ultra"),
      "1_Shaders_HIGH": enbFiles("high"),
      "1_Shaders_LOW": enbFiles("low"),
    },
  },
};

const mockAPPDATALocal: DirectoryStructure = {
  Wabbajack: {
    saved_settings: {
      "install-settings-1234567890123456.json": JSON.stringify({
        ModListLocation: modpackPath,
        InstallLocation: modpackPath,
        DownloadLocation: modpackPath,
        Metadata: {
          title: "Wildlander",
          description:
            "Wildlander is a modlist that aims to make Skyrim more immersive and challenging while also making it more beautiful and realistic.",
          version: "1.1.0",
          repositoryName: "Wildlander",
        },
      }),
      "install-settings-invalid.json": JSON.stringify({
        ModListLocation: "/invalid/path",
        InstallLocation: "/invalid/path",
        DownloadLocation: "/invalid/path",
        Metadata: {
          title: "Wildlander",
          description:
            "Wildlander is a modlist that aims to make Skyrim more immersive and challenging while also making it more beautiful and realistic.",
          version: "1.0.0",
          repositoryName: "Wildlander",
        },
      }),
    },
  },
};

removeSync(rootPath);
createDirectoryStructure(mockModpack, modpackPath);
createDirectoryStructure(mockAPPDATALocal, appDataPath);
