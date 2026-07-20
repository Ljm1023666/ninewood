process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

/** 生产 Web/API 同源（域名，勿硬编码 IP） */
const PRODUCTION_APP_URL = 'https://tothetomorrow.com';

// 仅开发环境忽略自签证书；打包后走正式 HTTPS，不再放行任意证书
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  if (!app.isPackaged) {
    event.preventDefault();
    callback(true);
    return;
  }
  callback(false);
});

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 生产请求 https://tothetomorrow.com；保持默认 webSecurity
    },
    frame: true,
    backgroundColor: '#0a0a1a',
  });

  // 与 vite.config.ts 中 server.port 一致
  const devURL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3080';
  const prodURL = process.env.ELECTRON_APP_URL || PRODUCTION_APP_URL;
  // 默认：打包后加载生产域名（与 macOS/Web 一致）。本地离线包：ELECTRON_USE_LOCAL_DIST=1
  const useLocalDist =
    process.env.ELECTRON_USE_LOCAL_DIST === '1' ||
    process.env.ELECTRON_USE_LOCAL_DIST === 'true';

  async function loadApp() {
    if (app.isPackaged && !useLocalDist) {
      try {
        await mainWindow.loadURL(prodURL);
        return;
      } catch (err) {
        console.error('[electron] load production URL failed, fallback to local dist', err);
      }
    }

    if (!app.isPackaged) {
      for (let i = 0; i < 10; i++) {
        try {
          await mainWindow.loadURL(devURL);
          mainWindow.webContents.openDevTools({ mode: 'detach' });
          return;
        } catch {
          if (i < 9) await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    // 本地 dist（开发失败回退，或 ELECTRON_USE_LOCAL_DIST=1）
    // 此时渲染进程走 file:，API 由 runtime-origin 解析到 PRODUCTION_ORIGIN
    await mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  loadApp();
}

function getSenderWindow(event) {
  return BrowserWindow.fromWebContents(event.sender) || BrowserWindow.getFocusedWindow();
}

ipcMain.handle('window:quit', (event) => {
  const win = getSenderWindow(event);
  if (!win) return false;
  win.close();
  return true;
});

ipcMain.handle('window:minimize', (event) => {
  const win = getSenderWindow(event);
  if (!win) return false;
  win.minimize();
  return true;
});

ipcMain.handle('window:maximize', (event) => {
  const win = getSenderWindow(event);
  if (!win) return false;
  win.isMaximized() ? win.unmaximize() : win.maximize();
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
