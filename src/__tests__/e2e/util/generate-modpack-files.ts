import fs from "fs";
import { removeSync } from "fs-extra";
import path from "path";
import { ModOrganizerIni } from "./files/ModOrganizer.ini";
import { SSEDisplayTweaks } from "./files/SSEDisplayTweaks.ini";
import namesMO2 from "./files/namesMO2.json";
import namesENB from "./files/namesENB.json";
import { archives } from "./files/profiles/archives.txt";
import { loadorder } from "./files/profiles/loadorder.txt";
import { modlist } from "./files/profiles/modlist.txt";
import { plugins } from "./files/profiles/plugins.txt";
import { settings } from "./files/profiles/settings.ini";
import { skyrim } from "./files/profiles/Skyrim.ini";
import { skyrimCustom } from "./files/profiles/SkyrimCustom.ini";
import { skyrimPrefs } from "./files/profiles/SkyrimPrefs.ini";

type DirectoryStructure = { [name: string]: string | DirectoryStructure };

export const createDirectoryStructure = (
  directoryObject: DirectoryStructure,
  basePath = ""
) => {
  fs.mkdirSync(basePath, { recursive: true });

  for (const [name, item] of Object.entries(directoryObject)) {
    const itemPath = `${basePath}/${name}`;

    if (typeof item === "object") {
      fs.mkdirSync(itemPath, { recursive: true });
      createDirectoryStructure(item, itemPath);
    } else {
      fs.writeFileSync(itemPath, item);
      fs.chmodSync(itemPath, 0o777); // Set file permissions to 777 so the app can execute them
    }
  }
};

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

const executable = (name: string) => `
#!/bin/bash

echo "Ran ${name} executable"
`;
/**
 * The files that are needed by the launcher for a "valid" modpack
 */
export const mockModpack: DirectoryStructure = {
  "ModOrganizer.exe": executable("ModOrganizer"),
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
      "archives.txt": archives(),
      "loadorder.txt": loadorder(),
      "modlist.txt": modlist(),
      "plugins.txt": plugins(),
      "settings.ini": settings(),
      "Skyrim.ini": skyrim(),
      "SkyrimCustom.ini": skyrimCustom(),
      "SkyrimPrefs.ini": skyrimPrefs(),
    },
    "1_Wildlander-HIGH": {
      "archives.txt": archives(),
      "loadorder.txt": loadorder(),
      "modlist.txt": modlist(),
      "plugins.txt": plugins(),
      "settings.ini": settings(),
      "Skyrim.ini": skyrim(),
      "SkyrimCustom.ini": skyrimCustom(),
      "SkyrimPrefs.ini": skyrimPrefs(),
    },
    "1_Wildlander-MEDIUM": {
      "archives.txt": archives(),
      "loadorder.txt": loadorder(),
      "modlist.txt": modlist(),
      "plugins.txt": plugins(),
      "settings.ini": settings(),
      "Skyrim.ini": skyrim(),
      "SkyrimCustom.ini": skyrimCustom(),
      "SkyrimPrefs.ini": skyrimPrefs(),
    },
    "1_Wildlander-LOW": {
      "archives.txt": archives(),
      "loadorder.txt": loadorder(),
      "modlist.txt": modlist(),
      "plugins.txt": plugins(),
      "settings.ini": settings(),
      "Skyrim.ini": skyrim(),
      "SkyrimCustom.ini": skyrimCustom(),
      "SkyrimPrefs.ini": skyrimPrefs(),
    },
    "1_Wildlander-POTATO": {
      "archives.txt": archives(),
      "loadorder.txt": loadorder(),
      "modlist.txt": modlist(),
      "plugins.txt": plugins(),
      "settings.ini": settings(),
      "Skyrim.ini": skyrim(),
      "SkyrimCustom.ini": skyrimCustom(),
      "SkyrimPrefs.ini": skyrimPrefs(),
    },
  },
  "Stock Game": {
    "SkyrimSE.exe": executable("SkyrimSE"),
    "SkyrimSELauncher.exe": executable("SkyrimSELauncher"),
  },
  launcher: {
    "namesMO2.json": JSON.stringify(namesMO2),
    "namesENB.json": JSON.stringify(namesENB),
    "ENB Presets": {
      "1_Shaders_ULTRA": enbFiles("ultra"),
      "1_Shaders_HIGH": enbFiles("high"),
      "1_Shaders_LOW": enbFiles("low"),
    },
  },
};

/**
 * Wabbajack saves its settings to APPDATA.
 * If working on a system that isn't windows, this can be useful to mock APPDATA.
 */
export const getMockAPPDATALocal = (
  installPath: string
): DirectoryStructure => ({
  Wabbajack: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    saved_settings: {
      "install-settings-1234567890123456.json": JSON.stringify({
        ModListLocation: installPath,
        InstallLocation: installPath,
        DownloadLocation: installPath,
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
});

// File has been run via the cli so create the files
if (process.argv[1] === __filename) {
  const rootPath = path.resolve(`${__dirname}/../../../../mock-files`);
  const modpackPath = `${rootPath}/mock-modpack-install`;
  const appDataPath = `${rootPath}/local`;

  removeSync(rootPath);
  createDirectoryStructure(mockModpack, modpackPath);
  createDirectoryStructure(getMockAPPDATALocal(modpackPath), appDataPath);
}
