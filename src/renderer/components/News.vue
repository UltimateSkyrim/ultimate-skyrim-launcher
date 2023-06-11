<template>
  <div v-if="!failedToGetNews && news.length > 0" class="c-news l-column">
    <TransitionGroup name="c-news__group">
      <div v-for="newsItem in news" :key="newsItem.url" class="c-news__item">
        <BaseLink
          :href="`https://www.patreon.com${newsItem.url}`"
          class="l-row"
        >
          <div class="c-news__published l-center-vertically">
            {{ new Date(newsItem.published).toLocaleDateString() }}
          </div>

          <div class="c-news__title">
            {{ newsItem.title }}
          </div>
        </BaseLink>
      </div>
    </TransitionGroup>
  </div>
  <div v-if="failedToGetNews && news.length === 0" class="l-flex l-center">
    Unable to load latest news.
  </div>
</template>

<script lang="ts">
import { Options as Component, Vue } from "vue-class-component";
import BaseList from "./BaseList.vue";
import type { Post, PostsService } from "@/renderer/services/posts.service";
import {
  injectStrict,
  SERVICE_BINDINGS,
} from "@/renderer/services/service-container";
import BaseLink from "@/renderer/components/BaseLink.vue";

@Component({
  components: {
    BaseList,
    BaseLink,
  },
})
export default class News extends Vue {
  newsService!: PostsService;
  news: Post[] = [];
  failedToGetNews = false;

  override async created() {
    this.newsService = injectStrict(SERVICE_BINDINGS.NEWS_SERVICE);
    try {
      this.news = await this.newsService.getPosts(this.updateNews);
    } catch {
      this.failedToGetNews = true;
    }
  }

  updateNews(news: Post[]) {
    this.news = news;
  }
}
</script>

<style lang="scss" scoped>
@import "~@/assets/scss";

.c-news {
  font-size: $font-size--small;
  padding-top: $size-spacing--large;
}

.c-news__title {
  flex: 1;

  &:hover {
    text-decoration: underline;
  }
}

.c-news__item {
  margin-bottom: $size-spacing;
  padding-left: $size-spacing--large;
  padding-right: $size-spacing--large;

  &:hover {
    background-color: $colour-background--dark;
  }
}

.c-news__published {
  color: $colour-text--secondary;

  flex: 0.3;
}

.c-news__group-enter-active,
.c-news__group-leave-active {
  transition: all 0.5s ease;
}

.c-news__group-enter-from,
.c-news__group-leave-to {
  opacity: 0;
  transform: translateY(-30px);
}
</style>