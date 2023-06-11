<template>
  <template v-if="version && version.includes('-')">
    <Popper :arrow="true" :interactive="false" placement="right" :hover="true">
      <template #content>
        Warning: you are using a beta version of the application. This will not
        automatically update. Click to be taken to the download page for the
        latest version.
      </template>
      <BaseLink
        href="https://github.com/Wildlander-mod/Launcher/releases/tag/v2.6.2"
      >
        <p class="u-text">
          Launcher Version: {{ version }}
          <span class="material-icons c-launcher-version__warning">
            warning
          </span>
        </p>
      </BaseLink>
    </Popper>
  </template>

  <template v-else>
    <p class="u-text">Launcher Version: {{ version }}</p>
  </template>
</template>

<script lang="ts">
import { Options as Component, Vue } from "vue-class-component";
import Popper from "vue3-popper";
import { Prop } from "vue-property-decorator";
import BaseLink from "@/renderer/components/BaseLink.vue";

@Component({
  components: {
    BaseLink,
    Popper,
  },
})
export default class LauncherVersion extends Vue {
  @Prop() version: string | null = null;
}
</script>

<style scoped lang="scss">
.c-launcher-version__warning {
  color: yellow;
}
</style>
