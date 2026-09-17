import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const candidates =
  process.platform === "win32"
    ? ["release/win-unpacked/Guardian Tales Mastery Planner.exe"]
    : [
        "release/mac-arm64/Guardian Tales Mastery Planner.app/Contents/MacOS/Guardian Tales Mastery Planner",
        "release/mac/Guardian Tales Mastery Planner.app/Contents/MacOS/Guardian Tales Mastery Planner",
      ];
const executable = process.argv[2] ?? candidates.find((p) => existsSync(p));
if (!executable)
  throw new Error(
    "Package the application before running the desktop smoke test.",
  );
const temporary = mkdtempSync(path.join(tmpdir(), "gt-planner-smoke-"));
const report = path.join(temporary, "result.json");
try {
  const env = {
    ...process.env,
    GT_SMOKE_PROFILE: path.join(temporary, "new-profile"),
    GT_SMOKE_REPORT: report,
  };
  delete env.ELECTRON_RUN_AS_NODE;
  const child = spawn(path.resolve(executable), ["--smoke-test"], {
    env,
    windowsHide: true,
    stdio: "inherit",
  });
  const timer = setTimeout(() => child.kill(), 45000);
  const exit = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  }).finally(() => clearTimeout(timer));
  const result = existsSync(report)
    ? JSON.parse(readFileSync(report, "utf8"))
    : { ok: false, error: "No render report received." };
  if (exit !== 0 || !result.ok) throw new Error(JSON.stringify(result));
  console.log("Packaged application smoke test passed:", result);
} finally {
  // Only the directory created by this invocation may be removed.
  const resolved = path.resolve(temporary);
  if (
    path.dirname(resolved) === path.resolve(tmpdir()) &&
    path.basename(resolved).startsWith("gt-planner-smoke-")
  ) {
    rmSync(resolved, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 200,
    });
  }
}
