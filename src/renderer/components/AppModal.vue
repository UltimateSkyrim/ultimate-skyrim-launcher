<template>
  <vue-final-modal
    v-model="model"
    :name="name"
    classes="l-flex l-center"
    content-class="c-modal l-flex"
    overlay-class="c-modal__overlay"
    :fit-parent="true"
    :click-to-close="false"
    :esc-to-close="false"
    :prevent-click="true"
    :lock-scroll="false"
  >
    <div class="l-column">
      <slot />

      <div
        v-if="includeCloseButton"
        class="c-modal__actions c-modal__actions--right"
      >
        <BaseButton v-if="includeCloseButton" @click="toggleModal(false)"
          >Close
        </BaseButton>
      </div>

      <div v-if="$slots.action" class="c-modal__actions u-spacing">
        <slot name="action"></slot>
      </div>
    </div>
  </vue-final-modal>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import { Prop, Watch } from "vue-property-decorator";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import type { ModalService } from "@/renderer/services/modal.service";
import BaseButton from "@/renderer/components/BaseButton.vue";

@Options({
  components: {
    BaseButton,
  },
})
export default class AppModal extends Vue {
  @Prop({ required: true }) name!: string;
  @Prop({ default: true }) showModal!: boolean;
  @Prop() includeCloseButton = false;
  model = false;

  modalService!: ModalService;

  override created() {
    this.modalService = injectStrict(SERVICE_BINDINGS.MODAL_SERVICE);
  }

  override mounted() {
    this.toggleModal(this.showModal);
  }

  @Watch("showModal")
  toggleModal(showModal: boolean) {
    if (showModal) {
      this.modalService.openModal(this.name, this.$vfm);
    } else {
      this.modalService.closeModal(this.name, this.$vfm);
    }
  }
}
</script>

<style lang="scss">
@import "~@/assets/scss";

.c-modal {
  display: flex;
  align-content: center;
  justify-content: center;

  padding: $size-spacing--large;
  margin: $size-spacing--x-large;

  background-color: $colour-background-secondary--transparent;
  border: 1px solid $colour-background--dark;
  backdrop-filter: $background-blur;
}

.c-modal__actions {
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: space-evenly;
  margin-top: $size-spacing;

  &--right {
    justify-content: flex-end;
  }
}

.c-modal__overlay {
  background-color: $colour-background-secondary--transparent;
  border: 1px solid $colour-background--dark;
  backdrop-filter: $background-blur;
}
</style>
