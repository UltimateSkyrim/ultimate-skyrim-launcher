<template>
  <div class="c-header l-row l-space-between">
    <BaseImage
      :image-source="modpack.logo"
      :alt="modpack.name"
      class="c-header__image"
    />

    <div class="c-header__links l-row l-no-flex-grow">
      <div v-if="modpack.website" class="c-header__link l-center-vertically">
        <BaseLink :href="modpack.website" :hover-style="true"
          >Website
        </BaseLink>
      </div>
      <div v-if="modpack.wiki" class="c-header__link l-center-vertically">
        <BaseLink :href="modpack.wiki" :hover-style="true">Wiki</BaseLink>
      </div>
      <div v-if="modpack.roadmap" class="c-header__link l-center-vertically">
        <BaseLink :href="modpack.roadmap" :hover-style="true">Roadmap</BaseLink>
      </div>
      <div v-if="modpack.wiki" class="c-header__link l-center-vertically">
        <BaseLink :href="modpack.patreon" :hover-style="true"
          >Patreon
        </BaseLink>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import type { Modpack } from "@/shared/types/modpack-metadata";
import modpack from "@/shared/wildlander/modpack.json";
import BaseLink from "@/renderer/components/BaseLink.vue";
import BaseImage from "@/renderer/components/BaseImage.vue";

@Options({
  components: { BaseLink, BaseImage },
})
export default class TheHeader extends Vue {
  modpack!: Modpack;

  override created() {
    this.modpack = modpack;
  }
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

// Specific margin to enable the logo to sit more visually aligned with the links
// This is due to the logo having a heavily weighted top compared to the bottom
$logoMargin: 2px;

.c-header {
  // The head links need a bit more space than normal due to their sizing
  margin-left: $size-spacing--x-large;
  margin-right: $size-spacing--x-large;
}

.c-header__link {
  margin-left: $size-spacing--large + $size-spacing--x-small;
  font-size: $font-size--large;
}

.c-header__image {
  margin-top: $logoMargin;
}

.c-header__links {
  margin-top: -$logoMargin;
}
</style>
