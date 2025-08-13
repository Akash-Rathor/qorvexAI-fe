const { app, BrowserWindow, desktopCapturer, ipcMain, screen } = require("electron");
const path = require("path");

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().size;

  const win = new BrowserWindow({
    width,
    height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  win.setIgnoreMouseEvents(false); // can be true if you want full click-through
  win.loadFile("index.html");
}

ipcMain.handle("start-screen-stream", async () => {
  const sources = await desktopCapturer.getSources({ types: ["screen"] });
  return sources[0].id;
});
ipcMain.on("set-clickable", (event, clickable) => {
  win.setIgnoreMouseEvents(!clickable, { forward: true });
});

app.whenReady().then(createWindow);
