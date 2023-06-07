import { App, inject, InjectionKey } from "vue";
import { PatreonService } from "./patreon.service";
import { PostsService } from "@/renderer/services/posts.service";
import { ModalService } from "@/renderer/services/modal.service";
import { MessageService } from "@/renderer/services/message.service";
import { EventService } from "@/renderer/services/event.service";
import { IpcService } from "@/renderer/services/ipc.service";
import { ModpackService } from "@/renderer/services/modpack.service";
import { CacheService } from "@/renderer/services/cache.service";
import type { Emitter, EventType } from "mitt";

export type EventService = Emitter<Record<EventType, unknown>>;

/*
 * IoC container to handle injecting services into Vue components
 */

/**
 * Create a new typed binding key
 */
export function createBinding<T>(key: string): InjectionKey<T> {
  return Symbol(key);
}

/**
 * Available keys to access services from the IoC container
 */
export const SERVICE_BINDINGS = {
  PATRON_SERVICE: createBinding<PatreonService>("keys.services.patron"),
  NEWS_SERVICE: createBinding<PostsService>("keys.services.news"),
  EVENT_SERVICE: createBinding<EventService>("keys.services.event"),
  MODAL_SERVICE: createBinding<ModalService>("keys.services.modal"),
  MESSAGE_SERVICE: createBinding<MessageService>("keys.services.message"),
  IPC_SERVICE: createBinding<IpcService>("keys.services.ipc"),
  MODPACK_SERVICE: createBinding<ModpackService>("keys.services.modpack"),
};

/**
 * Register all services
 */
export function registerServices(app: App) {
  const ipcService = new IpcService();
  const modpackService = new ModpackService(ipcService);
  const cacheService = new CacheService();
  app.provide(SERVICE_BINDINGS.IPC_SERVICE, ipcService);
  app.provide(
    SERVICE_BINDINGS.PATRON_SERVICE,
    new PatreonService(cacheService)
  );
  app.provide(SERVICE_BINDINGS.NEWS_SERVICE, new PostsService(cacheService));
  app.provide(SERVICE_BINDINGS.MESSAGE_SERVICE, new MessageService(ipcService));
  app.provide(SERVICE_BINDINGS.EVENT_SERVICE, EventService);
  app.provide(SERVICE_BINDINGS.MODAL_SERVICE, new ModalService(EventService));
  app.provide(SERVICE_BINDINGS.MODPACK_SERVICE, modpackService);

  return { ipcService, modpackService };
}

/**
 * Used when it makes sense to error if the injection doesn't exist
 * Useful for services as the application likely won't work without these
 */
export function injectStrict<T>(key: InjectionKey<T>, fallback?: T) {
  const resolved = inject(key, fallback);
  if (!resolved) {
    throw new Error(`Could not resolve ${key.description}`);
  }

  return resolved;
}
