const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron')
const path = require('node:path')

let mainWindow = null;
let trayElement = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    center: true,
    minWidth: 640,
    minHeight: 480,
    webPreferences: {
      sandbox: false,
      //nodeIntegration: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, "./resources/images/river-monitoring.ico")
  })
  mainWindow.loadFile(path.join(__dirname, './index.html'))
}

function createTrayElement(createTrayElement) {
  if (createTrayElement) {
    trayElement = new Tray(__dirname + "/resources/images/river-monitoring.ico");
    const contextMenu = Menu.buildFromTemplate([
      { label: "Open", type: "normal", click: () => { mainWindow.show() }},
      { label: "Shutdown client", type: "normal", click: () => { app.quit() } }
    ]);
    trayElement.setToolTip("River monitoring client");
    trayElement.setContextMenu(contextMenu);
    trayElement.on("double-click", () => {
      mainWindow.show();
    })
  } else if (trayElement != null) {
    trayElement.destroy();
    trayElement = null;
  }
}

app.whenReady().then(() => {
  createWindow()

  mainWindow.on('show', () => createTrayElement(false));
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
  
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.on("wc-close", (event, title) => app.exit());
ipcMain.on("wc-maximize", (event, title) => mainWindow.maximize());
ipcMain.on("wc-minimize", (event, title) => mainWindow.unmaximize());
ipcMain.on("wc-iconify", (event, title) => mainWindow.minimize());
ipcMain.on("wc-hide", (event, title) => {
  mainWindow.hide();
  createTrayElement(true);
});
