<template>
  <Popper
    :arrow="true"
    :interactive="false"
    placement="right"
    :show="showTooltipOnHover ? undefined : showTooltip && isOpen"
    :hover="showTooltipOnHover"
  >
    <template #content>
      <slot />
    </template>

    <div
      v-click-away="() => toggleOpenState(false)"
      class="c-select u-text"
      :class="{
        'c-select--fixed-width': !grow,
        'c-select--open': isOpen && !loading,
        'c-select--closed': !isOpen && !loading,
      }"
    >
      <div
        class="c-select__head u-text"
        :class="{
          'c-select__head--open': isOpen && !loading,
          'c-select__head--closed': !isOpen && !loading,
        }"
        @click="() => toggleOpenState()"
      >
        {{ currentSelection.text }}
        <span
          class="material-icons c-select__icon"
          :class="{
            'c-select__icon--open': isOpen && !loading,
            'c-select__icon--closed': !isOpen && !loading,
          }"
        >
          expand_more
        </span>
      </div>
      <div
        class="c-select__options u-scroll-y-auto u-text"
        :class="{
          'c-select__options--open': isOpen && !loading,
          'c-select__options--closed': !isOpen && !loading,
          'c-select__options--loading': loading,
          'c-select__options--small': small,
        }"
      >
        <div
          v-for="option in options.filter((x) => !x.hidden)"
          :key="option.value"
          class="c-select__option l-center-vertically"
          :class="{
            'c-select__option--disabled': option.disabled,
          }"
          @click="!option.disabled && select(option)"
        >
          <div class="u-text">{{ option.text }}</div>
        </div>
      </div>
    </div>
  </Popper>
</template>

<script lang="ts">
import { Options as Component, Vue } from "vue-class-component";
import { Prop } from "vue-property-decorator";
import Popper from "vue3-popper";

export interface SelectOption {
  text: string;
  value: unknown;
  disabled?: boolean;
  hidden?: boolean;
}

const selectedEvent = "selected";

@Component({
  components: { Popper },
  emits: [selectedEvent],
})
export default class BaseDropdown extends Vue {
  @Prop({ required: true }) options!: SelectOption[];
  @Prop({ required: true }) currentSelection!: SelectOption;
  @Prop({ default: false }) grow!: boolean;
  @Prop({ default: false }) showTooltip!: boolean;
  @Prop({ default: false }) showTooltipOnHover!: boolean;
  // Whether to reduce the size of the dropdown if there isn't enough space
  @Prop({ default: false }) small!: boolean;

  isOpen = false;
  loading = true;

  select(option: SelectOption) {
    this.isOpen = false;
    this.$emit(selectedEvent, option);
  }

  toggleOpenState(open?: boolean) {
    this.isOpen = open !== undefined ? open : !this.isOpen;
    // To prevent the closing class from playing the animation on load, a loading class is used to hide the options.
    // Once the dialog has been opened, it can be removed.
    if (this.isOpen) {
      this.loading = false;
    }
  }
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

$selectFocus: rgba(255, 255, 255, 0.1);
$selectHeight: $size-action-height;

.c-select {
  height: $selectHeight;
  user-select: none;
  border-radius: 2px;

  background-color: $colour-background--light;

  &--fixed-width {
    width: 150px;
  }

  &:hover {
    cursor: pointer;
    background-color: $colour-background--dark;
  }

  &--open {
    background-color: $colour-background--dark;
  }
}

.c-select--loading {
  display: none;
}

.c-select__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: $size-action-height;
  width: 100%;
  overflow: hidden;
  padding-left: 8px;

  .c-select__icon {
    align-self: center;

    &--closed {
      animation: rotate-reverse 0.2s linear forwards;

      @keyframes rotate-reverse {
        from {
          transform: rotate(-180deg);
        }
        to {
          transform: rotate(0deg);
        }
      }
    }

    &--open {
      animation: rotate 0.2s linear forwards;

      @keyframes rotate {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(-180deg);
        }
      }
    }
  }
}

.c-select__options {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  background-color: $colour-background--light-solid;
  transform-origin: top;
  z-index: 1;
  border-radius: 0 4px 4px 4px;
  max-height: 200px;
  padding-left: 8px;
  position: relative;

  &--closed {
    animation: retract 0.2s forwards;
  }

  &--open {
    animation: expand 0.2s forwards;
  }

  &--loading {
    display: none;
  }

  &--small {
    max-height: 155px;
  }

  @keyframes expand {
    from {
      transform: scaleY(0);
    }
    to {
      transform: scaleY(1);
    }
  }

  @keyframes retract {
    from {
      transform: scaleY(1);
    }
    to {
      transform: scaleY(0);
    }
  }
}

.c-select__option {
  cursor: default;
  min-height: $selectHeight;

  &--disabled {
    background-color: $colour-background--dark;
    color: $colour-text--secondary;
  }

  &:not(&--disabled):hover {
    background-color: $selectFocus;
    cursor: pointer;
  }
}
</style>
