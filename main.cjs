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
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#00000000', // Fully transparent background
  });

  // Optimize rendering
  win.setBackgroundThrottling(false);
  win.webContents.setFrameRate(30); // Reduced to 30fps to minimize rendering load
  win.setMinimumSize(200, 200); // Prevent resizing to 0

  if (isDev) {
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Uncomment for debugging
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

ipcMain.on('setWindowPosition', (event, { x, y }) => {
  try {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
    // Clamp position to stay within screen bounds
    const clampedX = Math.max(0, Math.min(x, screenWidth - 56)); // 56 is bubble size
    const clampedY = Math.max(0, Math.min(y, screenHeight - 56));
    win.setPosition(Math.round(clampedX), Math.round(clampedY));
  } catch (err) {
    console.error('Error setting window position:', err);
  }
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