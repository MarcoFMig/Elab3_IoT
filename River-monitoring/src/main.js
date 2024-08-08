const { app, BrowserWindow } = require('electron')
const path = require('node:path')

let mainWindow;

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
    icon: "./src/resources/images/river-monitoring.ico"
  })
  mainWindow.loadFile('./src/index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
