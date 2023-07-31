import { BindingKey } from "@loopback/core";
import type psList from "ps-list";

export type PSList = typeof psList;
export const psListBinding = BindingKey.create<typeof psList>("isDevelopment");
