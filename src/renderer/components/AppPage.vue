<template>
  <main
    class="l-column"
    :class="{
      'u-disable-click-events': !clickEventsEnabled,
    }"
  >
    <div class="l-row">
      <TheNavigation v-if="!preloadCheck" />
      <div class="l-column">
        <div class="c-app__page l-column">
          <TheHeader class="l-no-flex-grow" />
          <div class="c-page l-row">
            <router-view />
          </div>
        </div>
      </div>
    </div>
  </main>

  <MO2Modal />
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

import TheHeader from "@/renderer/components/TheHeader.vue";
import TheNavigation from "@/renderer/components/TheNavigation.vue";
import { modalOpenedEvent } from "@/renderer/services/modal.service";
import {
  DISABLE_LOADING_EVENT,
  ENABLE_LOADING_EVENT,
} from "@/renderer/services/event.service";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import { useRoute } from "vue-router";
import { watch } from "vue";
import MO2Modal from "@/renderer/components/MO2RunningModal.vue";

@Options({
  components: {
    TheHeader,
    TheNavigation,
    MO2Modal,
  },
})
export default class AppPage extends Vue {
  @Prop({ default: "column" }) layout!: "row" | "column";

  clickEventsEnabled = true;
  preloadCheck = true;

  private eventService = injectStrict(SERVICE_BINDINGS.EVENT_SERVICE);

  override created() {
    const route = useRoute();
    watch(
      () => route.name,
      () => {
        this.preloadCheck = route.meta?.["preload"] as boolean;
      }
    );

    this.eventService.on(modalOpenedEvent, (opened: unknown) => {
      this.setClickEventsEnabled(!opened as boolean);
    });

    this.eventService.on(ENABLE_LOADING_EVENT, () => {
      this.setClickEventsEnabled(false);
      this.setLoading(true);
    });

    this.eventService.on(DISABLE_LOADING_EVENT, () => {
      this.setClickEventsEnabled(true);
      this.setLoading(false);
    });
  }

  setClickEventsEnabled(enabled: boolean) {
    this.clickEventsEnabled = enabled;
  }

  setLoading(loading: boolean) {
    document.body.style.cursor = loading ? "progress" : "default";
  }
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

.c-app__page {
  margin-top: $size-spacing--titlebar;
}

.c-page {
  margin-top: $size-spacing--titlebar;
  margin-left: $size-spacing--x-large;
  margin-right: $size-spacing--x-large;

  // Awkward height because the layout engine doesn't allow the page to grow naturally
  // Needs replacing when there is a better layout engine
  max-height: 430px;

  z-index: 0;

  font-size: $font-size--body;
  font-weight: $font-weight;
}
</style>
