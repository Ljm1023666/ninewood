process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
    },
    frame: true,
    backgroundColor: '#0a0a1a',
  });

  // Try dev server a few times before falling back to built files
  const devURL = 'http://localhost:5173';
  async function loadApp() {
    for (let i = 0; i < 5; i++) {
      try {
        await mainWindow.loadURL(devURL);
        return;
      } catch {
        if (i < 4) await new Promise(r => setTimeout(r, 1500));
      }
    }
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
  loadApp();
}

ipcMain.on('window:quit', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.close();
});

ipcMain.on('window:minimize', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) win.minimize();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
