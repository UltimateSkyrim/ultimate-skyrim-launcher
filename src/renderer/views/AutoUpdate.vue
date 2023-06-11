<template>
  <AppModal name="autoUpdate">
    <div class="l-column l-center">
      <div v-if="checkingForUpdate" class="c-auto-update__loading">
        Checking for update...
      </div>
      <template v-else>
        <p class="u-text">There is a new version of the launcher available.</p>
        <p class="u-text">
          The application will download an update and restart automatically
          before continuing.
        </p>

        Download progress {{ downloadProgress }}%
      </template>
    </div>
  </AppModal>
</template>

<script lang="ts">
import { Options as Component, Vue } from "vue-class-component";
import AppPageContent from "@/renderer/components/AppPageContent.vue";
import BaseButton from "@/renderer/components/BaseButton.vue";
import AppModal from "@/renderer/components/AppModal.vue";
import { UPDATE_EVENTS } from "@/main/controllers/update/update.events";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";

@Component({
  components: {
    BaseButton,
    AppModal,
    PageContent: AppPageContent,
  },
})
export default class AutoUpdate extends Vue {
  downloadProgress = 0;
  checkingForUpdate = true;

  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  override async created() {
    this.ipcService.on(UPDATE_EVENTS.UPDATE_AVAILABLE, () => {
      this.checkingForUpdate = false;
    });

    this.ipcService.on(UPDATE_EVENTS.DOWNLOAD_PROGRESS, (progress) => {
      this.checkingForUpdate = false;
      this.downloadProgress = progress as number;
    });
  }
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

.c-auto-update__loading {
  margin: $size-spacing--x-large * 2;
}
</style>