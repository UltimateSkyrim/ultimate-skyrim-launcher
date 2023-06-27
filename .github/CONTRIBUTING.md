# Contributing

## Install dependencies

```
npm install
```

## Running

_Note_  
The application must be run against a valid modpack.  
If you do not have a valid modpack, a "dummy" modpack can be generated.

```shell
npm run generate:modpack-files
```

Start the application
```
npm run start
//or for automatic reloading of the main process with nodemon
npm run start:dev
```

If you have generated a modpack you might need to point the application to the right APP_DATA.  
This can be set with an environment variable

```shell
APPDATA="$(pwd)/mock-files/local" npm run start
```

## Building 

The application will be built and published automatically when merged to the main branch.  
However, if you want to build locally then you can run
```
npm run build
```

## Linting

All files will be automatically linted when committing. However, if you want to manually lint you can run

```
npm run lint
```

## Commit validation

This repository uses [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). All commits must follow this format.

## Architecture

Key technology:

- [Electron](https://www.electronjs.org/) - The core of the application is built using this.
- [Node.js](https://nodejs.org/en/) - Language used to build the electron `main` process (the backend of the application).
- [Vue 3](https://vuejs.org/) - Frontend framework
- [Loopback Context](https://loopback.io/doc/en/lb4/Context.html) - Dependency injection and IoC container used in the `main` process to simplify setup 

### Main process

The code for the main process is mostly broken into controllers and services, along with the application bootstrapping.

- `controllers` -  [Handle](https://www.electronjs.org/docs/latest/api/ipc-main#ipcmainhandlechannel-listener) ipc events from the `renderer`. These can be registered with the `@controller` decorator and ipc handlers with `@handle`.
- `services` - Responsible for the bulk of the logic. Controllers delegate to services to perform actual business logic.
- `application.ts` - Bootstraps and initialise the application, including registering the controller and service artefacts.

#### Example Controller

The following will register a controller with 2 ipc handlers.
It is recommended that the channel names are stored in a `const enum`.
```typescript
// `main/controllers/example/example.controller.ts`

import { controller, handle } from "@/main/decorators/controller.decorator";
import { EXAMPLE_EVENTS } from "@/main/controllers/example/example.events";
import { service } from "@loopback/core";
import { ExampleService } from "@/main/services/example.service";

@controller
export class ExampleController {
  constructor(@service(ExampleService) private exampleService: ExampleService) {
  }

  @handle('something else')
  async somethingElse(...args) {
    await this.exampleService.doSomethingElse(...args);
  }
  
  @handle(EXAMPLE_EVENTS.DO_SOMETHING)
  async doSomething(...args) {
    await this.exampleService.doSomething(...args);
  }
}
```

### Renderer process

Only the main process can access node events. The renderer process cannot directly access node events. To access "
backend" events, the renderer process must `invoke` events from the ipc service.
Because of this, importing anything with any node code into the renderer process will cause errors.
So, anything that must be shared between both must not contain node code. It is recommended that shared `const enum`s are put in their own file.

#### Example ipc invoke

```typescript

export default class Example extends Vue {
  private ipcService = injectStrict(SERVICE_BINDINGS.IPC_SERVICE);

  async created() {
    await this.ipcService.invoke(EXAMPLE_EVENTS.DO_SOMETHING)
  }
}

```
