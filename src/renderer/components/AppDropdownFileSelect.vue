<template>
  <BaseDropdown
    v-if="options"
    :current-selection="currentSelection ?? options[0]"
    :options="options"
    grow="true"
    :small="true"
    @selected="optionSelected"
  />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import BaseDropdown, {
  SelectOption,
} from "@/renderer/components/BaseDropdown.vue";
import { Prop } from "vue-property-decorator";
import BaseLabel from "@/renderer/components/BaseLabel.vue";
import { DIALOG_EVENTS } from "@/main/controllers/dialog/dialog.events";
import type { OpenDialogReturnValue } from "electron";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";

const selectAnotherFile = "SELECT_ANOTHER_FILE";
export const optionSelectedEvent = "file-selected";

@Options({
  components: { BaseLabel, BaseDropdown },
})
export default class AppDropdownFileSelect extends Vue {
  @Prop({ required: true }) private options!: SelectOption[];
  @Prop({ required: true }) private defaultText!: string;
  @Prop() private currentSelection!: SelectOption | null;
  @Prop() label!: string;

  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  override created() {
    this.options.push({
      text:
        this.options.length === 0
          ? "Select folder..."
          : "Choose another folder...",
      value: selectAnotherFile,
    });

    // Add the default option if none is selected
    if (!this.currentSelection) {
      this.options.unshift({
        text: this.defaultText,
        value: null,
        disabled: true,
        hidden: true,
      });
    }
  }

  async optionSelected({ value }: SelectOption) {
    if (value === selectAnotherFile) {
      const dialogResponse = (await this.ipcService.invoke(
        DIALOG_EVENTS.DIRECTORY_SELECT
      )) as OpenDialogReturnValue;
      if (!dialogResponse.canceled) {
        // Only one directory is allowed to be selected so use the first filepath
        this.$emit(optionSelectedEvent, dialogResponse.filePaths[0]);
      }
    } else {
      this.$emit(optionSelectedEvent, value);
    }
  }
}
</script>

<style scoped lang="scss"></style>