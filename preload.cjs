const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  setClickable: (clickable) => ipcRenderer.send('set-clickable', clickable),
  getScreenStream: () => ipcRenderer.invoke('getScreenStream')
});
