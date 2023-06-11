declare module "fetch-installed-software" {
  interface Response {
    RegistryDirName: string;
    DisplayIcon?: string;
    DisplayName?: string;
    HelpLink?: string;
    InstallLocation?: string;
    Publisher?: string;
    UninstallString?: string;
    URLInfoAbout?: string;
    NoRepair?: string;
    NoModify?: string;
  }

  export const getAllInstalledSoftware: () => Promise<Response[]>;
}
