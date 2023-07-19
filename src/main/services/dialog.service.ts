import {
  injectable,
  /* inject, */ BindingScope,
  Provider,
} from "@loopback/core";
import { dialog } from "electron";

export type Dialog = typeof dialog;

@injectable({ scope: BindingScope.TRANSIENT })
export class DialogProvider implements Provider<Dialog> {
  value() {
    return dialog;
  }
}
