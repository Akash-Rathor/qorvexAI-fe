const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

function createWindow() {
  const { screen } = require("electron");
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.loadFile("index.html");
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
  return sources[0]; // returns the first screen
});
