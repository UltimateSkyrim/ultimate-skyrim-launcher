import { DialogProvider } from "@/main/services/dialog.service";
import { expect } from "@loopback/testlab";
import { dialog } from "electron";

describe("Dialog service", () => {
  let dialogService: DialogProvider;

  beforeEach(() => {
    dialogService = new DialogProvider();
  });

  it("should provide an instance of electron dialog", async () => {
    expect(dialogService.value()).to.equal(dialog);
  });
});
