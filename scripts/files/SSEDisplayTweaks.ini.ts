import { stringify } from "ini";

export const SSEDisplayTweaks = stringify({
  Render: {
    Fullscreen: false,
    Borderless: true,
    BorderlessUpscale: true,
    Resolution: "3840x2160",
  },
});
