import { Page, test } from "@playwright/test";
import { startTestApp, StartTestAppReturn } from "../util/setup";

test.describe("Mod directory", () => {
  let window: Page;
  let closeTestApp: StartTestAppReturn["closeTestApp"];

  test.beforeAll(async () => {
    ({ window, closeTestApp } = await startTestApp(test));
  });

  test.afterAll(async () => {
    await closeTestApp();
  });

  test("select the mod directory from the initial selection", async () => {
    const modDirectorySelectTestId = "mod-directory-select";

    await window.getByTestId(modDirectorySelectTestId).waitFor({
      state: "visible",
    });

    await window.getByTestId(modDirectorySelectTestId).click();

    await window
      .getByTestId(modDirectorySelectTestId)
      .getByTestId("dropdown-options-0")
      .click();

    await test.expect(window.getByTestId("page-home")).toBeVisible();
  });
});
