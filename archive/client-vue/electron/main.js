"use strict";
const { app, BrowserWindow } = require('electron');
const path = require('path');
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        icon: path.join(__dirname, '../public/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        frame: true,
        titleBarStyle: 'hidden',
        backgroundColor: '#0a0a1a',
    });
    if (process.env.NODE_ENV === 'development') {
        const devURL = 'http://localhost:5173';
        (async () => {
            for (let i = 0; i < 5; i++) {
                try {
                    await mainWindow.loadURL(devURL);
                    mainWindow.webContents.openDevTools();
                    return;
                }
                catch {
                    if (i < 4)
                        await new Promise(r => setTimeout(r, 1500));
                }
            }
            mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
        })();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0)
    createWindow(); });
//# sourceMappingURL=main.js.map