const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const isDev = !app.isPackaged;

  win = new BrowserWindow({
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

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile('index.html');
  }

  // Default: whole app click-through
  win.setIgnoreMouseEvents(true, { forward: true });

ipcMain.on("set-clickable", (event, clickable) => {
  win.setIgnoreMouseEvents(!clickable, { forward: true });
});
}

ipcMain.handle('getScreenStream', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return { id: sources[0].id };
});

app.whenReady().then(createWindow);
