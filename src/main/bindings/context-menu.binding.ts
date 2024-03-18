import { BindingKey } from "@loopback/core";
import type contextMenu from "electron-context-menu";

export type ContextMenu = typeof contextMenu;
export const ContextMenuBinding = BindingKey.create<typeof contextMenu>(
  "bindings.context-menu"
);
