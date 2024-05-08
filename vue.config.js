const dependencies = require("./package.json").dependencies;

module.exports = {
  configureWebpack: {
    externals: {
      // TODO can this be removed?
      electron: "window",
      "@/main/logger": "window",
    },
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: false,
      externals: Object.keys(dependencies),
      bundleMainProcess: false,
      mainProcessFile: "dist/main.js",
      rendererProcessFile: "src/renderer/index.ts",
      outputDir: "dist",
      builderOptions: {
        productName: "Wildlander Launcher",
        icon: "public/images/logos/wildlander-icon-light.png",
        publish: {
          provider: "github",
          releaseType: "release",
        },
        extraMetadata: {
          name: "Wildlander Launcher",
        },
        files: [
          "**",
          {
            from: "../main",
            to: "./main",
            filter: ["!*.map*"],
          },
          {
            from: "../shared",
            to: "./shared",
            filter: ["!*.map*"],
          },
          {
            from: "../",
            to: ".",
            filter: [
              "preload.*",
              "modpack.json",
              "additional-instructions.json",
            ],
          },
        ],
        extraResources: [
          {
            from: "./src/assets/tools",
            to: "tools",
            filter: ["**/*"],
          },
        ],
        nsis: {
          deleteAppDataOnUninstall: true,
        },
      },
    },
  },
};
