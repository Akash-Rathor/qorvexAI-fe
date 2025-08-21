// preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenStream: () => ipcRenderer.invoke('getScreenStream'),
  getWindowSize: () => ipcRenderer.invoke('getWindowSize'),
  getWindowPosition: () => ipcRenderer.invoke('getWindowPosition'),
  getScreenWorkArea: () => ipcRenderer.invoke('getScreenWorkArea'),
  setWindowSize: (width, height) => ipcRenderer.send('setWindowSize', { width, height }),
  setWindowPosition: (x, y, width, height) => 
    ipcRenderer.send('setWindowPosition', { x, y, width, height }),
  setResizable: (resizable) => ipcRenderer.send('setResizable', resizable)
});