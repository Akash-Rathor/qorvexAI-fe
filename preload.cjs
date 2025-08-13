const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getScreenStream: () => ipcRenderer.invoke('getScreenStream'),
  setClickable: (state) => ipcRenderer.send('set-clickable', state),
  setOverlayRegions: (elements) => {
    // Get bounding rects and send to main process as {x, y, width, height}
    const rects = elements.map(el => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.left),
        y: Math.round(r.top),
        width: Math.round(r.width),
        height: Math.round(r.height)
      };
    });
    ipcRenderer.send('set-overlay-regions', rects);
  }
});
