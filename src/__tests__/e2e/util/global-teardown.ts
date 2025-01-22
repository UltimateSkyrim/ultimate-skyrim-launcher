import fs from "fs/promises";
import { config } from "./config";
import libCoverage from "istanbul-lib-coverage";
import libReport from "istanbul-lib-report";
import reports from "istanbul-reports";

async function displayCoverage(): Promise<void> {
  const coveragePath = `${config().paths.playwright}/coverage`;

  try {
    const files = await fs.readdir(coveragePath);

    // Check if there are any .json files (coverage files)
    const hasCoverage = files.some((file) => file.endsWith(".json"));

    if (!hasCoverage) {
      console.warn("No coverage data found.");
      return;
    }

    const coverageMap = libCoverage.createCoverageMap({});

    for (const file of files) {
      if (file.endsWith(".json")) {
        const coverageData = await fs.readFile(
          `${coveragePath}/${file}`,
          "utf8"
        );
        coverageMap.merge(JSON.parse(coverageData));
      }
    }

    // create a context for report generation
    const context = libReport.createContext({
      // dir: 'report/output/dir',
      // The summarizer to default to (may be overridden by some reports)
      // values can be nested/flat/pkg. Defaults to 'pkg'
      defaultSummarizer: "nested",
      // watermarks: configWatermarks,
      coverageMap,
    });

    // create an instance of the relevant report class, passing the
    // report name e.g. json/html/html-spa/text
    const report = reports.create("text", {
      skipEmpty: false,
      skipFull: false,
    });

    // call execute to synchronously create and write the report to disk/console
    report.execute(context);
  } catch (err) {
    console.error("Error during global teardown:", err);
  }
}

const clearMockFiles = async () => {
  await fs.rm(`${config().paths.mockFiles}`, { recursive: true, force: true });
};

async function globalTeardown() {
  if (process.env["COVERAGE"] !== "false") {
    await displayCoverage();
  }

  await clearMockFiles();
}

export default globalTeardown;
