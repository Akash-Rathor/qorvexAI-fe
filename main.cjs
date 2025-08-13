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
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  win.loadFile('index.html');

  // Make whole window click-through except interactive areas
  win.setIgnoreMouseEvents(true, { forward: true });

  ipcMain.on('set-clickable', (event, isClickable) => {
    win.setIgnoreMouseEvents(!isClickable, { forward: true });
  });
}

// Screen stream request
ipcMain.handle('getScreenStream', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return { id: sources[0].id };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
