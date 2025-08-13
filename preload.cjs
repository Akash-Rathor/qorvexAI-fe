const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getScreenStream: () => ipcRenderer.invoke("getScreenStream"),
  setClickable: (state) => ipcRenderer.send("set-clickable", state),
});
