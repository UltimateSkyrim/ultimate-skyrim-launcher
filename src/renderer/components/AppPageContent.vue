<template>
  <div class="c-page-content l-column">
    <div
      class="c-page-content__body"
      :class="{
        'c-page-content__body--large-spacing': spacing,
        'u-scroll-y-auto': scrollable,
      }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

export default class AppPageContent extends Vue {
  @Prop({ required: false }) title!: string;
  @Prop({ default: true }) spacing!: boolean;
  @Prop({ default: false }) center!: boolean;
  @Prop({ default: false }) scrollable!: boolean;
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

.c-page-content {
  &:not(:last-of-type) {
    margin-right: $size-spacing;
  }
}

.c-page-content__title {
  font-size: $font-size--x-large;
  font-weight: $font-weight--x-large;
  margin-top: 10px;
  margin-bottom: 10px;
}

.c-page-content__body {
  display: flex;

  backdrop-filter: $background-blur;
  background-color: $colour-background-secondary--transparent;
  border: 1px solid $colour-background--dark;
}

.c-page-content__body--large-spacing {
  padding: $size-spacing--x-large;
}
</style>