<template>
  <AppModal :show-modal="mo2Running" name="mo2Running">
    <div class="l-column l-center">
      <div class="u-spacing l-center-text">
        <p class="u-text">Mod Organizer 2 is currently running.</p>
        <p class="u-text">
          To prevent conflicts, the launcher has been locked until Mod Organizer
          is closed.
        </p>
      </div>
      <BaseButton type="warning" size="large" @click="closeMO2"
        >Kill all MO2 Processes
      </BaseButton>
    </div>
  </AppModal>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import AppModal from "@/renderer/components/AppModal.vue";
import BaseButton from "@/renderer/components/BaseButton.vue";
import { MOD_ORGANIZER_EVENTS } from "@/main/controllers/modOrganizer/modOrganizer.events";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";

@Options({
  components: { AppModal, BaseButton },
})
export default class MO2Modal extends Vue {
  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  mo2Running = false;

  override async created() {
    await this.checkIfRunning();
    this.watchMO2Running();
  }

  watchMO2Running() {
    setTimeout(async () => {
      await this.checkIfRunning();
      this.watchMO2Running();
    }, 1000);
  }

  async checkIfRunning() {
    this.mo2Running = await this.ipcService.invoke(
      MOD_ORGANIZER_EVENTS.IS_MO2_RUNNING
    );
  }

  async closeMO2() {
    await this.ipcService.invoke(MOD_ORGANIZER_EVENTS.CLOSE_MO2);
  }
}
</script>

<style lang="scss" scoped></style>
