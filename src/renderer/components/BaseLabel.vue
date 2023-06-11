<template>
  <label class="c-label" :class="{ 'c-label--centered': centered }">
    {{ label }}
  </label>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";

@Options({})
export default class BaseLabel extends Vue {
  @Prop() centered!: boolean;
  @Prop() label!: string;
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

.c-label {
  font-size: $font-size--body;
  line-height: $line-height__body;

  margin-bottom: $size-spacing;
}

.c-label--centered {
  display: flex;
  justify-content: center;
  text-align: center;
}
</style>