<template>
  <div
    class="c-app"
    :style="[
      backgroundImage && { 'background-image': `url(${backgroundImage})` },
    ]"
  >
    <TheTitleBar />

    <AppPage />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import type { Modpack } from "@/shared/wildlander/modpack-metadata";
import TheTitleBar from "@/renderer/components/TheTitleBar.vue";
import { MODPACK_EVENTS } from "@/main/controllers/modpack/mopack.events";
import AppPage from "@/renderer/components/AppPage.vue";

@Options({
  components: {
    AppPage,
    TheTitleBar,
  },
})
export default class App extends Vue {
  private modpack!: Modpack | undefined;
  backgroundImage = "";

  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  override async created() {
    this.modpack = await this.ipcService.invoke(
      MODPACK_EVENTS.GET_MODPACK_METADATA
    );
    if (this.modpack?.backgroundImage) {
      this.backgroundImage = this.modpack.backgroundImage;
    } else {
      this.backgroundImage = "/images/default-background.png";
    }
  }
}
</script>

<style lang="scss">
@import "~@/assets/scss";

$size-scrollbar: 16px;
$colour-scrollbar-arrows: white;

body {
  margin: 0;
}

.c-app {
  background-repeat: no-repeat;
  background-size: cover;

  color: $colour-text;
  display: flex;
  flex-direction: column;
  height: $size-window-height;
  width: $size-window-width;

  font-size: $font-size;
}

// Custom scrollbars

::-webkit-scrollbar {
  width: $size-scrollbar;
  background-color: $colour-background--darker;
}

::-webkit-scrollbar-thumb {
  background-color: $colour-background--dark;
}

/* Buttons */
::-webkit-scrollbar-button:single-button {
  height: $size-scrollbar;
  width: $size-scrollbar;

  display: block;
  background-size: $size-scrollbar;
  background-repeat: no-repeat;
  background-position: center;
}

// Up arrow
::-webkit-scrollbar-button:single-button:vertical:decrement {
  background-image: url('data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#{$colour-scrollbar-arrows}"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14l-6-6z"/></svg>');
}

::-webkit-scrollbar-button:vertical:single-button:decrement:hover,
::-webkit-scrollbar-button:vertical:single-button:increment:hover {
  background-color: $colour-background--dark;
}

// Down arrow
::-webkit-scrollbar-button:single-button:vertical:increment {
  background-image: url('data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#{$colour-scrollbar-arrows}"><path d="M24 24H0V0h24v24z" fill="none"/><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/></svg>');
}
</style>
