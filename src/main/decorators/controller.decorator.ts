import { ipcMain, IpcMainInvokeEvent } from "electron";
import type { Constructor } from "@loopback/context";
import log from "electron-log";
import "reflect-metadata";

export interface Controller {
  registerHandlers(): void;
}

const HandlersMetadataKey = Symbol("handlers");
const logger = log.create("decorator");
type HandlerMap = Map<string, (...args: unknown[]) => unknown>;

/**
 Add a method to controllers that can be called to register all IPC handlers.
 This is then automatically be called by the booter.
 e.g.
 ```typescript
 @controller
 class ExampleController {

    @handler("channelName")
    method(){
      //Do something when 'channelName' event is invoked...
    }

 }
 ```
 */
export function controller<T extends Constructor<object>>(Base: T) {
  return {
    [Base.name]: class extends Base implements Controller {
      public registerHandlers() {
        const handlers: HandlerMap = Reflect.getMetadata(
          HandlersMetadataKey,
          this
        );
        handlers.forEach((method, channel) => {
          logger.silly(`Registered handler "${channel}"`);
          ipcMain.handle(
            channel,
            (event: IpcMainInvokeEvent, ...args: unknown[]) =>
              method.apply(this, [...args, event])
          );
        });
      }
    },
  }[Base.name];
}

/**
 * @handle decorator for controllers.
 * This decorator is used to register a method as an IPC handler.
 * @param channel - The channel name to listen for.
 */
export function handle(channel: string) {
  return function (
    target: object,
    _propertyKey: string,
    propertyDescriptor: PropertyDescriptor
  ) {
    const handlers =
      Reflect.getMetadata(HandlersMetadataKey, target) || new Map();
    handlers.set(channel, propertyDescriptor.value);
    Reflect.defineMetadata(HandlersMetadataKey, handlers, target);
  };
}
