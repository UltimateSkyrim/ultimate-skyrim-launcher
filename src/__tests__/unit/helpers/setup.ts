import mock from "mock-require";

// electron-is-dev throws an error if not running in an electron environment.
mock("electron-is-dev", () => {
  return true;
});
