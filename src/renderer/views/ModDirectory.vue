<template>
  <AppModal v-if="modpackMetadata" name="modDirectory">
    <BaseImage
      :image-source="modpackMetadata.logo"
      :alt="modpackMetadata.name"
      class="c-startup__logo"
    />
    <ModDirectory
      :label="`To get started, select your ${modpackMetadata.name} installation directory:`"
    />
    <span class="c-startup__directory-note">
      Note: you should not install modpacks to any of
      <BaseLink
        href="https://github.com/Wildlander-mod/Launcher/wiki/Directories-you-should-avoid-installing-a-modpack-in"
        :underline="true"
      >
        these directories</BaseLink
      >.
    </span>
  </AppModal>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import AppModal from "@/renderer/components/AppModal.vue";
import BaseImage from "@/renderer/components/BaseImage.vue";
import BaseLink from "@/renderer/components/BaseLink.vue";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import type { Modpack } from "@/shared/types/modpack-metadata";
import { MODPACK_EVENTS } from "@/main/controllers/modpack/mopack.events";
import ModDirectory from "@/renderer/components/ModDirectory.vue";

@Options({
  components: { BaseLink, BaseImage, AppModal, ModDirectory },
})
export default class ModDirectoryView extends Vue {
  ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  modpackMetadata: Modpack | null = null;

  override async created() {
    this.modpackMetadata = await this.ipcService.invoke(
      MODPACK_EVENTS.GET_MODPACK_METADATA
    );
  }
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

.c-startup__logo {
  margin-bottom: $size-spacing--x-large;
}

.c-startup__directory-note {
  font-style: italic;
  font-size: $font-size;
  margin-top: $size-spacing;
}
</style>