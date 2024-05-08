import { BindingKey } from "@loopback/core";
import type { UserPreferences } from "@/main/services/config.service";
import type Store from "electron-store";

export const ConfigBinding =
  BindingKey.create<Store<UserPreferences>>("bindings.config");
