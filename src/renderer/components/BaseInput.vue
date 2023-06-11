<template>
  <div class="l-column">
    <BaseLabel :label="label" :centered="centered" />
    <input
      type="text"
      :readonly="readonly"
      class="c-input"
      :value="value"
      @input="input"
      @click="click"
    />
  </div>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Emit, Prop } from "vue-property-decorator";
import BaseLabel from "@/renderer/components/BaseLabel.vue";

@Options({
  components: { BaseLabel },
  emits: ["input", "click"],
})
export default class BaseInput extends Vue {
  @Prop({ required: true }) label!: string;
  @Prop({ default: false }) readonly!: boolean;
  @Prop({ default: false }) centered!: boolean;
  @Prop() value!: string;

  @Emit()
  input(event: Event) {
    return event.target as HTMLInputElement;
  }

  @Emit()
  click(event: Event) {
    return event.target as HTMLInputElement;
  }
}
</script>

<style scoped lang="scss">
@import "~@/assets/scss";

.c-input {
  height: $size-action-height;
  padding: $size-spacing;

  margin-right: $size-spacing;

  box-sizing: border-box;
  color: #ffffff;
  background: $colour-background--light;
  border: none;
  border-radius: 2px;
}
</style>
