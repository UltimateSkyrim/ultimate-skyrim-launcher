import type { CacheService } from "@/renderer/services/cache.service";

export class PatreonService {
  private patrons: Patron[] = [];
  private readonly cacheKey = "patreon.patrons";
  private readonly cacheService: CacheService;

  constructor(cacheService: CacheService) {
    this.cacheService = cacheService;
  }

  private static shufflePatrons(patrons: Patron[]): Patron[] {
    const shuffledArray = [...patrons]; // Create a copy of the original array

    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // Generate a random index
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j]!, shuffledArray[i]!]; // Swap elements
    }

    return shuffledArray;
  }


  public async getPatrons(shuffle = true): Promise<Patron[]> {
    if (this.patrons.length === 0) {
      const cache = this.cacheService.get<Patron[]>(
        this.cacheKey,
        60 * 60 * 24
      );
      if (cache?.content) {
        this.patrons = cache.content;
      }
    }

    try {
      if (this.patrons.length > 0) {
        return this.patrons;
      }

      const response = await fetch("https://ultsky.phinocio.com/api/patreon");
      const data = (await response.json()) as { patrons: Patron[] };
      // Shuffle the array to show different Patrons each time
      this.patrons = shuffle
        ? PatreonService.shufflePatrons(data.patrons)
        : data.patrons;
      this.cacheService.set(this.cacheKey, this.patrons);
      return this.patrons;
    } catch (error) {
      throw new Error(`Failed to get Patrons: ${error}`);
    }
  }
}

export interface Patron {
  name: string;
  tier: "Patron" | "Super Patron";
}
