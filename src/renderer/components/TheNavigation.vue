<template>
  <nav class="c-navigation">
    <div class="c-navigation__actions">
      <BaseButton type="primary" size="grow" @click="launchGame"
        >Launch Game
      </BaseButton>

      <ProfileSelection />

      <GraphicsSelection />

      <ENB />

      <Resolution />
    </div>

    <div class="c-navigation__content l-column l-space-between">
      <div class="l-column">
        <router-link
          v-slot="{ href, navigate, isActive }"
          :to="{
            name: 'Home',
          }"
          custom
        >
          <NavigationItem :active="isActive" :href="href" @click="navigate">
            Home
          </NavigationItem>
        </router-link>

        <router-link
          v-slot="{ href, navigate, isActive }"
          :to="{
            name: 'Community',
          }"
          custom
        >
          <NavigationItem :active="isActive" :href="href" @click="navigate">
            Community
          </NavigationItem>
        </router-link>

        <router-link
          v-slot="{ href, navigate, isActive }"
          :to="{
            name: 'Advanced',
          }"
          custom
        >
          <NavigationItem :active="isActive" :href="href" @click="navigate">
            Advanced
          </NavigationItem>
        </router-link>
      </div>

      <div class="c-navigation__launcher-info">
        <p class="u-text">Modpack version: {{ modpackVersion }}</p>
        <LauncherVersion :version="launcherVersion" />
        <p class="u-text">
          <BaseLink
            href="https://github.com/Wildlander-mod/Launcher"
            :underline="true"
            >Help contribute
          </BaseLink>
        </p>
      </div>
    </div>
  </nav>

  <AppModal :show-modal="gameRunning" name="gameRunning">
    <div class="l-column l-center l-center-text">
      <div class="u-spacing">
        <template v-if="checkingPrerequisites">
          Checking if {{ modpackName }} prerequisites are installed...
        </template>
        <template v-if="installingPrerequisites">
          <div>
            <div>{{ modpackName }} prerequisites are currently installing.</div>
            <div>Please click "Install" or "Repair" on any pop ups.</div>
            <div>
              Ensure you close all pop ups that appear after installation is
              complete.
            </div>
          </div>
        </template>
        <template v-if="!checkingPrerequisites && !installingPrerequisites">
          Launching {{ modpackName }} version {{ modpackVersion }}. This is not
          an error, and launching may take several minutes.
        </template>
      </div>
    </div>
  </AppModal>

  <AppModal name="rebootModal" :show-modal="rebootRequired">
    <div class="l-column l-center l-center-text">
      <div class="u-spacing">
        A system reboot is required to complete installation.
      </div>
    </div>

    <template #action>
      <BaseButton type="primary" @click="reboot">Reboot</BaseButton>
    </template>
  </AppModal>
</template>

<script lang="ts">
import { Options as Component, Vue } from "vue-class-component";
import AppModal from "@/renderer/components/AppModal.vue";
import BaseLink from "@/renderer/components/BaseLink.vue";
import NavigationItem from "@/renderer/components/NavigationItem.vue";
import BaseButton from "@/renderer/components/BaseButton.vue";
import Resolution from "@/renderer/components/Resolution.vue";
import ProfileSelection from "@/renderer/components/ProfileSelection.vue";
import ENB from "@/renderer/components/ENB.vue";
import { MOD_ORGANIZER_EVENTS } from "@/main/controllers/modOrganizer/modOrganizer.events";
import { logger } from "@/main/logger";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import { WABBAJACK_EVENTS } from "@/main/controllers/wabbajack/wabbajack.events";
import { SYSTEM_EVENTS } from "@/main/controllers/system/system.events";
import { LAUNCHER_EVENTS } from "@/main/controllers/launcher/launcher.events";
import { DIALOG_EVENTS } from "@/main/controllers/dialog/dialog.events";
import { MODPACK_EVENTS } from "@/main/controllers/modpack/mopack.events";
import type { Modpack } from "@/shared/types/modpack-metadata";
import Popper from "vue3-popper";
import LauncherVersion from "@/renderer/components/LauncherVersion.vue";
import GraphicsSelection from "@/renderer/components/GraphicsSelection.vue";

@Component({
  components: {
    GraphicsSelection,
    LauncherVersion,
    ENB,
    AppModal,
    Resolution,
    ProfileSelection,
    BaseLink,
    BaseButton,
    NavigationItem,
    Popper,
  },
})
export default class TheNavigation extends Vue {
  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  gameRunning = false;
  checkingPrerequisites = false;
  installingPrerequisites = false;
  rebootRequired = false;
  launcherVersion: string | null = null;
  modpackVersion: string | null = null;
  modpackName: string | null = null;

  override async created() {
    this.modpackVersion = await this.ipcService.invoke(
      WABBAJACK_EVENTS.GET_MODPACK_VERSION
    );

    this.modpackName = (
      await this.ipcService.invoke<Modpack>(MODPACK_EVENTS.GET_MODPACK_METADATA)
    ).name;

    this.launcherVersion = await this.getVersion();
  }

  async getVersion() {
    return this.ipcService.invoke<string>(LAUNCHER_EVENTS.GET_VERSION);
  }

  async checkPrerequisites(message = true) {
    if (message) {
      this.checkingPrerequisites = true;
    }
    const installed = await this.ipcService.invoke<boolean>(
      SYSTEM_EVENTS.CHECK_PREREQUISITES
    );
    if (message) {
      this.checkingPrerequisites = false;
    }
    return installed;
  }

  resetChecks() {
    this.installingPrerequisites = false;
    this.checkingPrerequisites = false;
    this.gameRunning = false;
  }

  async installPrerequisites() {
    this.installingPrerequisites = true;
    await this.ipcService.invoke(SYSTEM_EVENTS.INSTALL_PREREQUISITES);
    const installed = await this.checkPrerequisites(false);
    if (!installed) {
      logger.error(`Error installing prerequisites`);
      throw new Error(
        `Program not available after successful install. Perhaps try restarting your PC.`
      );
    }
    this.installingPrerequisites = false;
  }

  async launchGame() {
    logger.debug("Setting game to running");
    this.gameRunning = true;
    const installed = await this.checkPrerequisites();
    if (!installed) {
      try {
        await this.installPrerequisites();
        this.resetChecks();
        this.rebootRequired = true;
        return;
      } catch (error) {
        logger.error(`Error installing prerequisites: ${error}`);
        await this.ipcService.invoke(DIALOG_EVENTS.ERROR, {
          title: "Install failed",
          error: `Failed to install prerequisites. ${error}`,
        });
        this.resetChecks();
        return;
      }
    }

    await this.ipcService.invoke(MOD_ORGANIZER_EVENTS.LAUNCH_GAME);
    logger.debug("Setting game to no longer running");
    this.gameRunning = false;
  }

  reboot() {
    this.ipcService.invoke(SYSTEM_EVENTS.REBOOT);
  }
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

.c-navigation {
  backdrop-filter: $background-blur--more;
  background: transparentize($colour-background, 0.8);

  z-index: 1;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-around;

  width: 225px;
}

.c-navigation__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;

  width: 100%;
  padding: 30px;

  border-bottom: 1px solid $colour-background--light;

  box-sizing: border-box;

  & * {
    margin-bottom: $size-spacing;
  }

  :last-child {
    margin-bottom: 0;
  }
}

.c-navigation__content {
  width: 100%;
  padding-left: $size-spacing--x-large;
  padding-top: $size-spacing--x-large;
  padding-bottom: $size-spacing--x-large;
  flex: 1;

  box-sizing: border-box;
}

.c-navigation__launcher-info {
  font-size: $font-size;
  color: $colour-text--secondary;
}
</style>