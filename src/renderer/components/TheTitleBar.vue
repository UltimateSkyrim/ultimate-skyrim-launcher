<template>
  <div class="c-title-bar l-row l-end" :class="{ 'l-no-flex-grow': !grow }">
    <div class="c-title-bar__navigation-bar"></div>
    <div class="c-title-bar__control" @click="minimize">
      <span class="material-icons c-title-bar__control-icon"> remove </span>
    </div>
    <div class="c-title-bar__control" @click="close">
      <span class="material-icons c-title-bar__control-icon"> close </span>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import { WINDOW_EVENTS } from "@/main/controllers/window/window.events";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";

export default class TheTitleBar extends Vue {
  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  @Prop({ default: false }) grow!: boolean;

  async close() {
    await this.ipcService.invoke(WINDOW_EVENTS.CLOSE);
  }

  async minimize() {
    await this.ipcService.invoke(WINDOW_EVENTS.MINIMIZE);
  }
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

.c-title-bar {
  height: $size-spacing--titlebar;

  position: absolute;
  top: 0;
  left: 0;
  width: $size-window-width;

  // The modal used sets its background-blur z-index to 1000. The title bar needs to be able to go over the top.
  z-index: 2000;
}

.c-title-bar__control-icon {
  // This needs to match the size of the bar itself
  font-size: $size-spacing--titlebar;
}

.c-title-bar__control {
  -webkit-app-region: no-drag;
  cursor: pointer;

  &:hover {
    background-color: $colour-background--dark;
  }
}

.c-title-bar__navigation-bar {
  // Allow the whole window to be dragged by the navigation bar
  -webkit-app-region: drag;
  -webkit-user-select: none;
  flex-grow: 1;
}
</style>