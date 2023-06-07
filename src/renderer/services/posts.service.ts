import { logger } from "@/main/logger";
import type { CacheService } from "@/renderer/services/cache.service";

export class PostsService {
  private posts: Post[] | undefined;
  private readonly cacheKey = "patreon.posts";
  private readonly cacheService: CacheService;
  private readonly remoteEndpoint = "https://ultsky.phinocio.com/api";

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  /**
   *
   * @param afterFetch - optional method to be called after fetching data from the API. Only called if the cache is used.
   */
  public async getPosts(afterFetch?: (posts: Post[]) => void) {
    logger.info("Getting posts");
    // If posts are already available, just return them.
    if (this.posts) {
      logger.debug("Posts already in memory, returning");
      return this.posts;
    }

    const cache = this.cacheService.get<Post[]>(this.cacheKey);
    if (cache?.content) {
      logger.debug(`Posts in cache with age: ${cache.age}`);
      this.posts = cache.content;

      // If the cache is outdated, fetch the most recent data but still return the cache
      if (cache.age && (await this.checkIfCacheOutdated(cache.age / 1000))) {
        logger.debug(
          "Cache outdated after checking remote. Fetching up to date posts."
        );
        new Promise(() => {
          this.fetchPosts().then((posts) => {
            if (afterFetch) {
              logger.debug("Calling optional method after fetching posts");
              afterFetch(posts);
              logger.debug("Finished calling optional method");
            }
          });
        });
      }

      return this.posts;
    }

    try {
      this.posts = await this.fetchPosts();
      return this.posts;
    } catch (error) {
      throw new Error(`Failed to get News: ${error}`);
    }
  }

  async fetchPosts() {
    const response = await fetch(`${this.remoteEndpoint}/patreon`);
    const posts = (await response.json()).posts as Post[];
    this.cacheService.set(this.cacheKey, posts);
    return posts;
  }

  async checkIfCacheOutdated(comparisonTime: number): Promise<boolean> {
    const response = await fetch(`${this.remoteEndpoint}/last-updated`);
    const { last_updated: lastUpdated } =
      (await response.json()) as LastUpdatedResponse;
    return comparisonTime < lastUpdated;
  }
}

export interface Post {
  title: string;
  content: string;
  published: string;
  url: string;
  tags: string[];
}

interface LastUpdatedResponse {
  last_updated: number;
}
