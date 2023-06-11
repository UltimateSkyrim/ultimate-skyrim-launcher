export interface WabbajackModpackMetadata {
  [key: string]: {
    title?: string | null;
    version?: string | null;
    installPath: string;
    lastUpdated?: Date;
  };
}

export interface WabbajackV2SettingsFile {
  $type: string;

  [key: string]: {
    $type: string;
    Metadata: unknown;
    ModList: {
      $type: string;
      Archives: Array;
      Author: string;
      Description: string;
      Directives: Array;
      GameType: string;
      Image: string;
      ModManager: 0;
      Name: string;
      Readme: string;
      WabbajackVersion: string;
      Website: string;
      Version: string;
      IsNSFW: boolean;
    };
    InstallationPath: string;
    DownloadPath: string;
    WabbajackPath: string;
    InstalledAt: string;
  };
}

export interface WabbajackInstallSettings {
  ModListLocation: string;
  InstallLocation: string;
  DownloadLoadction: string;
  Metadata?: {
    title: string;
    description: string;
    author: string;
    maintainers: string[];
    game: string;
    official: boolean;
    tags: string[];
    nsfw: boolean;
    utility_list: boolean;
    image_contains_title: boolean;
    force_down: boolean;
    links: {
      image: string;
      readme: string;
      download: string;
      machineURL: string;
      discordURL: string;
    };
    download_metadata: {
      Hash: string;
      Size: number;
      NumberOfArchives: number;
      SizeOfArchives: number;
      NumberOfInstalledFiles: number;
      SizeOfInstalledFiles: number;
    };
    version: string;
    dateCreated: string;
    dateUpdated: string;
    repositoryName: string;
  };
}
