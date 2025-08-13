const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const isDev = process.env.ELECTRON_DEV === 'true';

  win = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Start clickable, toggle from React
  win.setIgnoreMouseEvents(false);

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }

  // Listen for toggle from React
  ipcMain.on("set-clickable", (event, clickable) => {
    win.setIgnoreMouseEvents(!clickable, { forward: true });
  });
}

// Provide screen sources to renderer
ipcMain.handle('getScreenStream', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  return { id: sources[0].id };
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
