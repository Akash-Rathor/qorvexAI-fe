const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');

  // Listen for overlay region updates from renderer
  ipcMain.on('set-overlay-regions', (event, rects) => {
    win.setIgnoreMouseEvents(true, { forward: true });
    win.setShape(rects);
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Handle screen capture request
ipcMain.handle('getScreenStream', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return { id: sources[0].id };
});
