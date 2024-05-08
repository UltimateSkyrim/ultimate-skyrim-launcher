import { stringify } from "ini";

export const ModOrganizerIni = stringify({
  customExecutables: {
    size: 1,
    "1\\binary": "mock/first/custom/executable.exe",
    "1\\title": "SKSE",
  },
  General: {
    gameName: "Skyrim Special Edition",
    selected_profile: "@ByteArray(0_Wildlander-STANDARD)",
  },
  Settings: {
    lock_gui: false,
  },
});
