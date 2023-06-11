import type { IIniObject, IIniObjectSection } from "js-ini";

export interface ModOrganizerIni extends IIniObject {
  General: IIniObjectSection;
  customExecutables: IIniObjectSection;
  Settings: IIniObjectSection;
}
