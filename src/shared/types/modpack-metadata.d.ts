export interface Modpack {
  name: string;
  logo: string;
  backgroundImage?: string;
  website: string;
  wiki: string;
  patreon: string;
  roadmap: string;
}

export interface FriendlyDirectoryMap {
  real: string;
  friendly: string;
  hidden?: boolean;
}
