import { sinon, StubbedInstanceWithSinonAccessor } from "@loopback/testlab";
import type {
  OverloadParameters,
  OverloadReturnType,
} from "@/shared/types/overloads";
import * as util from "util";
import type { ChildProcess } from "@/main/bindings/child-process.binding";
import type * as child_process from "child_process";

// Mock out the exec method from child_process, so it doesn't actually attempt to spawn anything in a test.
export const getChildProcessMock =
  (): StubbedInstanceWithSinonAccessor<ChildProcess> => {
    function childProcessMock() {}

    childProcessMock.prototype.exec = sinon.stub<
      OverloadParameters<typeof child_process.exec>,
      OverloadReturnType<typeof child_process.exec>
    >();

    // The process is promisified in the application, so it needs to be promisified in the mock.
    // https://nodejs.org/docs/latest-v8.x/api/util.html#util_util_promisify_original
    childProcessMock.prototype.exec[util.promisify.custom] =
      childProcessMock.prototype.exec;

    // The child_process module is very difficult to mock without replacing the module.
    // This provider makes it easy to inject mock child_process stubs into the application.
    // Because of the Overload utility types, the stubs are type-safe, but TypeScript doesn't know that here.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const childProcess = new childProcessMock();

    return Object.assign(childProcess as ChildProcess, {
      stubs: childProcess as sinon.SinonStubbedInstance<ChildProcess>,
    });
  };
