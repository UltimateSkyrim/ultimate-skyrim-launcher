import { BindingKey } from "@loopback/core";
import type { AppUpdater } from "electron-updater";

export const AutoUpdaterBinding = BindingKey.create<AppUpdater>(
  "bindings.autoUpdater"
);
