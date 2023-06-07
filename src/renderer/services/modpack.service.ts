import {
  IsModpackValidResponse,
  MODPACK_EVENTS,
} from "@/main/controllers/modpack/mopack.events";
import type { IpcService } from "@/renderer/services/ipc.service";

export class ModpackService {
  constructor(private ipcService: IpcService) {}

  public isModDirectorySet() {
    return this.ipcService.invoke(MODPACK_EVENTS.IS_MODPACK_SET);
  }

  public getModpackDirectory() {
    return this.ipcService.invoke<string>(MODPACK_EVENTS.GET_MODPACK);
  }

  public async isModDirectoryValid(modDirectory: string) {
    return this.ipcService.invoke<IsModpackValidResponse>(
      MODPACK_EVENTS.IS_MODPACK_DIRECTORY_VALID,
      modDirectory
    );
  }

  public async isCurrentModpackValid() {
    return this.isModDirectoryValid(await this.getModpackDirectory());
  }

  public async deleteModpackDirectory() {
    await this.ipcService.invoke(MODPACK_EVENTS.DELETE_MODPACK_DIRECTORY);
  }
}
