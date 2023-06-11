<template>
  <BaseDropdown
    v-if="enbPresets !== null && selectedEnb !== null"
    :current-selection="selectedEnb"
    :options="enbPresets"
    :grow="true"
    :show-tooltip-on-hover="true"
    @selected="onEnbChanged"
  >
    Uses GPU. Determines the quality of post-processing effects: ambient
    occlusion, sun rays, advanced lighting, and more.
  </BaseDropdown>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import BaseDropdown, {
  SelectOption,
} from "@/renderer/components/BaseDropdown.vue";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import type { FriendlyDirectoryMap } from "@/shared/types/modpack-metadata";
import { ENB_EVENTS } from "@/main/controllers/enb/enb.events";
import {
  DISABLE_LOADING_EVENT,
  ENABLE_LOADING_EVENT,
} from "@/renderer/services/event.service";
import { logger } from "@/main/logger";

@Options({
  components: { BaseDropdown },
})
export default class ENB extends Vue {
  selectedEnb: SelectOption | null = null;
  enbPresets: SelectOption[] | null = null;
  eventService = injectStrict(SERVICE_BINDINGS.EVENT_SERVICE);
  ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  override async created() {
    this.enbPresets = this.directoryMapToSelectOptions(
      await this.getEnbPresets()
    );
    this.selectedEnb = await this.getInitialEnb(this.enbPresets);
  }

  async getInitialEnb(enbs: SelectOption[]): Promise<SelectOption> {
    const enbPreference = await this.ipcService.invoke(
      ENB_EVENTS.GET_ENB_PREFERENCE
    );
    return (
      enbs.find((enb) => enb.value === enbPreference) ??
      (enbs[0] as SelectOption)
    );
  }

  async getEnbPresets(): Promise<FriendlyDirectoryMap[]> {
    return [
      ...(await this.ipcService.invoke<FriendlyDirectoryMap[]>(
        ENB_EVENTS.GET_ENB_PRESETS
      )),
    ];
  }

  directoryMapToSelectOptions(
    directoryMap: FriendlyDirectoryMap[]
  ): SelectOption[] {
    return directoryMap.map(({ friendly, real }) => ({
      text: friendly,
      value: real,
    }));
  }

  async onEnbChanged(option: SelectOption) {
    logger.debug(`User selected enb ${option.value}`);
    this.eventService.emit(ENABLE_LOADING_EVENT);

    if (option.value !== this.selectedEnb?.value) {
      await this.ipcService.invoke(ENB_EVENTS.SET_ENB_PREFERENCE, option.value);
      this.selectedEnb = option;
    }

    this.eventService.emit(DISABLE_LOADING_EVENT);
  }
}
</script>
