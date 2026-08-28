const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Software rendering avoids blank Electron windows on some Windows GPU/driver combinations.
app.disableHardwareAcceleration();

async function createWindow() {
  const root = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..');
  const unpacked = path.join(root, 'app.asar.unpacked', 'desktop-dist', 'index.html');
  const bundled = app.isPackaged ? path.join(root, 'app.asar', 'desktop-dist', 'index.html') : path.join(root, 'desktop-dist', 'index.html');
  // electron-builder may unpack the static UI or leave it inside app.asar.
  const page = fs.existsSync(unpacked) ? unpacked : bundled;
  const win = new BrowserWindow({ width: 1420, height: 960, minWidth: 900, minHeight: 680, backgroundColor: '#0c1017', title: 'Guardian Tales Mastery Planner', autoHideMenuBar: true, webPreferences: { contextIsolation: true, sandbox: true } });
  await win.loadFile(page);
}
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
