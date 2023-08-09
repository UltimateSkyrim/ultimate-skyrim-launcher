import { BindingKey } from "@loopback/core";
import type electron from "electron";

export const ElectronBinding = BindingKey.create<typeof electron>("electron");
