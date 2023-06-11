<template>
  <BaseDropdown
    v-if="resolutions !== null && selectedResolution !== null"
    :options="resolutions"
    :current-selection="selectedResolution"
    :show-tooltip-on-hover="true"
    :grow="true"
    @selected="onResolutionSelected"
  >
    <div class="l-row">
      <div v-if="containsUltrawide">
        <span class="material-icons c-resolution__info-icon u-text">
          info
        </span>
        <div>
          Ultra-widescreen resolutions are not supported in this modpack.
          <BaseLink
            href="https://github.com/Wildlander-mod/Support/wiki/FAQ#does-this-pack-support-ultrawide-resolutions"
            :underline="true"
          >
            More info.
          </BaseLink>
        </div>
      </div>
      <div>
        If your desired resolution has not been detected, go to the advanced tab
        and edit the launcher config.
      </div>
    </div>
  </BaseDropdown>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import BaseDropdown, {
  SelectOption,
} from "@/renderer/components/BaseDropdown.vue";
import type { Resolution as ResolutionType } from "@/shared/types/Resolution";
import BaseLink from "@/renderer/components/BaseLink.vue";
import BaseInput from "@/renderer/components/BaseInput.vue";
import { logger } from "@/main/logger";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import { asyncFilter } from "@/shared/util/asyncFilter";
import { RESOLUTION_EVENTS } from "@/main/controllers/resolution/resolution.events";

@Options({
  components: { BaseLink, BaseDropdown, BaseInput },
})
export default class Resolution extends Vue {
  selectedResolution: SelectOption | null = null;
  resolutions: SelectOption[] | null = null;
  containsUltrawide = false;

  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  override async created() {
    const resolutions = await this.getResolutions();
    this.containsUltrawide =
      (
        await asyncFilter(resolutions, async ({ width, height }) => {
          return this.ipcService.invoke(
            RESOLUTION_EVENTS.IS_UNSUPPORTED_RESOLUTION,
            {
              width,
              height,
            }
          );
        })
      ).length > 0;

    this.resolutions = await this.resolutionsToSelectOptions(resolutions);
    this.selectedResolution =
      (
        await this.resolutionsToSelectOptions([
          await this.getResolutionPreference(),
        ])
      )[0] || null;
  }

  private async resolutionsToSelectOptions(
    resolutions: ResolutionType[]
  ): Promise<SelectOption[]> {
    return Promise.all(
      resolutions.map(async ({ height, width }) => ({
        text: `${width} x ${height}`,
        value: { width, height },
        disabled:
          (await this.ipcService.invoke(
            RESOLUTION_EVENTS.IS_UNSUPPORTED_RESOLUTION,
            {
              width,
              height,
            }
          )) ?? false,
      }))
    );
  }

  async getResolutionPreference(): Promise<ResolutionType> {
    return this.ipcService.invoke<ResolutionType>(
      RESOLUTION_EVENTS.GET_RESOLUTION_PREFERENCE
    );
  }

  async getResolutions(): Promise<ResolutionType[]> {
    return this.ipcService.invoke(RESOLUTION_EVENTS.GET_RESOLUTIONS);
  }

  async onResolutionSelected(option: SelectOption) {
    logger.debug(`User selected resolution ${JSON.stringify(option.value)}`);
    const value = option.value as ResolutionType;
    await this.ipcService.invoke(RESOLUTION_EVENTS.SET_RESOLUTION_PREFERENCE, {
      height: value.height,
      width: value.width,
    });
    this.selectedResolution = option;
  }
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

.c-resolution__info-icon {
  margin-right: $size-spacing--small;
}
</style>
