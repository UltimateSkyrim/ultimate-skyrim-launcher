<template>
  <BaseLabel :label="label" />
  <AppDropdownFileSelect
    :options="modpacks"
    :current-selection="modDirectory"
    default-text="Select mod directory..."
    v-if="modpacks"
    @file-selected="modDirectorySet"
  />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import { SelectOption } from "@/renderer/components/BaseDropdown.vue";
import BaseLabel from "@/renderer/components/BaseLabel.vue";
import modpack from "@/main/wildlander/modpack.json";
import { MODPACK_EVENTS } from "@/main/controllers/modpack/mopack.events";
import { Prop } from "vue-property-decorator";
import { WABBAJACK_EVENTS } from "@/main/controllers/wabbajack/wabbajack.events";
import { WindowEvents } from "@/main/controllers/window/window.events";
import { ENABLE_LOADING_EVENT } from "@/renderer/services/event.service";
import AppDropdownFileSelect from "@/renderer/components/AppDropdownFileSelect.vue";

@Options({
  components: { AppDropdownFileSelect, BaseLabel },
})
export default class ModDirectory extends Vue {
  private modDirectory!: SelectOption | null;
  private modpacks: SelectOption[] | null = null;
  @Prop({ default: `${modpack.name} installation folder` })
  private label!: string;

  private eventService = injectStrict(SERVICE_BINDINGS.EVENT_SERVICE);
  private messageService = injectStrict(SERVICE_BINDINGS.MESSAGE_SERVICE);
  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);
  private modpackService = injectStrict(SERVICE_BINDINGS.MODPACK_SERVICE);

  async created() {
    this.modDirectory = await this.getCurrentModDirectory();

    const installedModpacks = await this.getInstalledModpacks();

    if (
      this.modDirectory !== null &&
      !installedModpacks.includes(this.modDirectory.value as string)
    ) {
      installedModpacks.push(this.modDirectory.value as string);
    }
    this.modpacks = await this.convertModpackPathsToOptions(installedModpacks);
  }

  async getCurrentModDirectory(): Promise<SelectOption | null> {
    const modpack = await this.modpackService.getModpackDirectory();
    return modpack ? this.convertModpackToOption(modpack) : null;
  }

  async getInstalledModpacks() {
    return (await this.ipcService.invoke(
      WABBAJACK_EVENTS.GET_INSTALLED_MODPACKS
    )) as string[];
  }

  async convertModpackPathsToOptions(
    modpacks: string[]
  ): Promise<SelectOption[]> {
    return modpacks.map(this.convertModpackToOption);
  }

  convertModpackToOption(modpack: string): SelectOption {
    return { text: modpack, value: modpack };
  }

  async checkModDirectoryIsValid(filepath: string): Promise<boolean> {
    const { ok: modDirectoryOkay, missingPaths } =
      await this.modpackService.isModDirectoryValid(filepath);

    if (!modDirectoryOkay) {
      await this.triggerError(missingPaths);
      return false;
    }
    return true;
  }

  async modDirectorySet(filepath: string) {
    if (await this.checkModDirectoryIsValid(filepath)) {
      this.eventService.emit(ENABLE_LOADING_EVENT);
      await this.ipcService.invoke(MODPACK_EVENTS.SET_MODPACK, filepath);
      this.modDirectory = { text: filepath, value: filepath };
      await this.ipcService.invoke(WindowEvents.RELOAD);
    }
  }

  async triggerError(missingPaths?: string[]) {
    const missingPathsError = missingPaths
      ? `Missing files/directories: ${JSON.stringify(missingPaths)
          .replace("[", "")
          .replace("]", "")}`
      : "";
    await this.messageService.error({
      title: "Invalid modpack directory selected",
      error: `Please ensure this is a valid modpack installation directory. Remember, this is NOT the Skyrim directory, it is the mod's installation directory. ${missingPathsError}`,
    });
  }
}
</script>
