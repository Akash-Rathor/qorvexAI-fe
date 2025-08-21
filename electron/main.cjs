const { app, BrowserWindow, ipcMain, desktopCapturer, screen } = require('electron');
const path = require('path');

let win;

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const isDev = process.env.ELECTRON_DEV === 'true';

  win = new BrowserWindow({
    width: 360,
    height: 420,
    x: screenWidth - 360 - 20,
    y: 20,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    backgroundColor: '#00000000',
  });

  // Optimize rendering
  win.setBackgroundThrottling(false);
  win.webContents.setFrameRate(30);
  win.setMinimumSize(360, 420);

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
}


// Provide screen sources to renderer
ipcMain.handle('getScreenStream', async () => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    return { id: sources[0].id };
  } catch (err) {
    console.error('Error getting screen stream:', err);
    return { id: null };
  }
});

ipcMain.handle('getWindowSize', () => {
  return win.getSize();
});

ipcMain.handle('getWindowPosition', () => {
  return win.getPosition();
});

ipcMain.handle('getScreenWorkArea', () => {
  return screen.getPrimaryDisplay().workAreaSize;
});

ipcMain.on('setWindowSize', (event, { width, height }) => {
  try {
    win.setSize(Math.round(width), Math.round(height));
  } catch (err) {
    console.error('Error setting window size:', err);
  }
});

ipcMain.handle('setWindowPosition', (event, { x, y, width = 60, height = 60 }) => {
  const { bounds } = screen.getPrimaryDisplay();
  const clampedX = Math.max(bounds.x, Math.min(x, bounds.x + bounds.width - width));
  const clampedY = Math.max(bounds.y, Math.min(y, bounds.y + bounds.height - height));
  win.setBounds({ x: clampedX, y: clampedY, width, height });
});




ipcMain.on('setResizable', (event, resizable) => {
  try {
    win.setResizable(resizable);
  } catch (err) {
    console.error('Error setting resizable:', err);
  }
});

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
