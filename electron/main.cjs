const { app, BrowserWindow, dialog, shell, session } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const smokeTest = process.argv.includes("--smoke-test");
// Keep the original profile and file:// origin so existing users retain their data.
const profilePath =
  smokeTest && process.env.GT_SMOKE_PROFILE
    ? process.env.GT_SMOKE_PROFILE
    : path.join(app.getPath("appData"), "guardian-tales-mastery-planner");
try {
  fs.mkdirSync(profilePath, { recursive: true });
  app.setPath("userData", profilePath);
} catch (error) {
  startupFailed(error);
}
app.disableHardwareAcceleration();
let trustedPageUrl;

function reportSmoke(result) {
  if (process.env.GT_SMOKE_REPORT)
    fs.writeFileSync(process.env.GT_SMOKE_REPORT, JSON.stringify(result));
}
function startupFailed(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (smokeTest) reportSmoke({ ok: false, error: message });
  else
    dialog.showErrorBox(
      "Guardian Tales Mastery Planner could not start",
      `Version ${app.getVersion()}\n${message}\n\nDownload the complete release again. If you extracted a ZIP, keep all its files together. Your saved account data has not been deleted.`,
    );
  app.exit(1);
}

async function createWindow() {
  const root = app.isPackaged
    ? process.resourcesPath
    : path.resolve(__dirname, "..");
  const unpacked = path.join(
    root,
    "app.asar.unpacked",
    "desktop-dist",
    "index.html",
  );
  const bundled = app.isPackaged
    ? path.join(root, "app.asar", "desktop-dist", "index.html")
    : path.join(root, "desktop-dist", "index.html");
  const page = fs.existsSync(unpacked) ? unpacked : bundled;
  if (!fs.existsSync(page))
    throw new Error("The application interface is missing.");
  const pageUrl = pathToFileURL(page).href;
  trustedPageUrl = pageUrl;
  const win = new BrowserWindow({
    width: 1420,
    height: 960,
    minWidth: 380,
    minHeight: 580,
    show: false,
    backgroundColor: "#0c1017",
    title: `Guardian Tales Mastery Planner ${app.getVersion()}`,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (url.split("#")[0] !== pageUrl) event.preventDefault();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const target = new URL(url);
      if (target.protocol === "https:" && target.hostname === "github.com")
        void shell.openExternal(url);
    } catch {
      /* Invalid URLs stay blocked. */
    }
    return { action: "deny" };
  });
  win.webContents.on("render-process-gone", (_event, details) =>
    startupFailed(new Error(`The interface stopped (${details.reason}).`)),
  );
  const rendererErrors = [];
  if (smokeTest)
    win.webContents.on("console-message", (_event, details) => {
      if (details.level === "error") rendererErrors.push(details.message);
    });
  if (!smokeTest) win.once("ready-to-show", () => win.show());
  await win.loadFile(page);
  if (smokeTest) {
    const result = await win.webContents
      .executeJavaScript(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      const inspect = () => {
        if (document.querySelectorAll('.class-card').length === 4) {
          const wallpaper = new Image();
          const background = getComputedStyle(document.body).backgroundImage.match(/url\\("?([^')"]+)/);
          if (!background) return reject(new Error('Wallpaper is missing.'));
          wallpaper.src = background[1];
          Promise.all([...Array.from(document.images).map(image => image.decode()), wallpaper.decode()]).then(() =>
            resolve({ ok: true, heading: document.querySelector('h1').textContent, cards: 4, images: document.images.length, wallpaper: true })
          ).catch(reject);
        } else if (Date.now() > deadline) reject(new Error('Planner did not render.'));
        else setTimeout(inspect, 100);
      }; inspect();
    })`);
    if (
      !result.heading.includes(app.getVersion()) ||
      result.images < 4 ||
      rendererErrors.length
    )
      throw new Error(
        `Render verification failed: ${JSON.stringify({ result, rendererErrors })}`,
      );
    reportSmoke(result);
    app.exit(0);
  }
}
app
  .whenReady()
  .then(() => {
    const allowedPermission = (contents, permission) =>
      permission === "clipboard-sanitized-write" &&
      contents?.getURL() === trustedPageUrl;
    session.defaultSession.setPermissionRequestHandler(
      (contents, permission, callback) =>
        callback(allowedPermission(contents, permission)),
    );
    session.defaultSession.setPermissionCheckHandler((contents, permission) =>
      allowedPermission(contents, permission),
    );
    void createWindow().catch(startupFailed);
    app.on("activate", () => {
      if (!smokeTest && BrowserWindow.getAllWindows().length === 0)
        void createWindow().catch(startupFailed);
    });
  })
  .catch(startupFailed);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
