const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  quitApp: () => ipcRenderer.send('window:quit'),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
});
