import {
  InstructionAction,
  InstructionType,
} from "@/shared/enums/additional-instructions";

interface AdditionalInstructionBase {
  // The version the instruction applies to
  version?: string;
}

export type Target = string | string[];

export interface PluginOrModInstruction extends AdditionalInstructionBase {
  type: InstructionType;
  target: Target;
}

// Instruction will be run when enb is changed
// The `target` is the enb that the change will be applied on
interface PluginInstruction extends PluginOrModInstruction {
  action: InstructionAction.DISABLE_PLUGIN | InstructionAction.ENABLE_PLUGIN;
  plugin: string;
}

// Instruction will be run when enb is changed
// The `target` is the enb that the change will be applied on
interface ModInstruction extends PluginOrModInstruction {
  action: InstructionAction.DISABLE_MOD | InstructionAction.ENABLE_MOD;
  mod: string;
}

// A single entry of `disable-ultra-widescreen` is enough for the instruction to return true
interface DisableUltraWidescreenInstruction extends AdditionalInstructionBase {
  type?: string;
  action: InstructionAction.DISABLE_ULTRA_WIDESCREEN;
}

export type AdditionalInstruction =
  | PluginInstruction
  | ModInstruction
  | DisableUltraWidescreenInstruction;

export type AdditionalInstructions = AdditionalInstruction[];
