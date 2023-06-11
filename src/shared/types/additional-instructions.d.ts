interface AdditionalInstructionBase {
  // The version the instruction applies to
  version?: string;
}

export type Target = string | string[];

export interface PluginOrModInstruction extends AdditionalInstructionBase {
  type: "enb" | "resolution-ratio";
  target: Target;
}

// Instruction will be run when enb is changed
// The `target` is the enb that the change will be applied on
interface PluginInstruction extends PluginOrModInstruction {
  action: "disable-plugin" | "enable-plugin";
  plugin: string;
}

// Instruction will be run when enb is changed
// The `target` is the enb that the change will be applied on
interface ModInstruction extends PluginOrModInstruction {
  action: "disable-mod" | "enable-mod";
  mod: string;
}

// A single entry of `disable-ultra-widescreen` is enough for the instruction to return true
interface DisableUltraWidescreenInstruction extends AdditionalInstructionBase {
  type?: string;
  action: "disable-ultra-widescreen";
}

export type AdditionalInstruction =
  | PluginInstruction
  | ModInstruction
  | DisableUltraWidescreenInstruction;

export type AdditionalInstructions = AdditionalInstruction[];
