<template>
  <span data-testid="page-home">
    <AppPageContent :spacing="false" :scrollable="true">
      <News />
    </AppPageContent>

    <AppPageContent
      title="Patron Highlight"
      :spacing="false"
      :scrollable="true"
    >
      <Patrons />
    </AppPageContent>
  </span>
</template>

<script lang="ts">
import { Options, Vue } from "vue-class-component";
import AppPage from "@/renderer/components/AppPage.vue";
import AppPageContent from "@/renderer/components/AppPageContent.vue";
import News from "@/renderer/components/News.vue";
import Patrons from "@/renderer/components/Patrons.vue";

@Options({
  components: { Patrons, News, AppPageContent, AppPage },
})
export default class ViewHome extends Vue {}
</script>

<style lang="scss" scoped></style>
