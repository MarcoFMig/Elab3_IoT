const { contextBridge, ipcRenderer } = require('electron')

const RiverMonitoring = {
  Window: class Window {
    static actions = {
      CLOSE_WINDOW,
      ENLARGE_WINDOW,
      NORMALIZE_WINDOW,
      MINIMIZE_WINDOW
    }
  }
}

const guiControl = {
  mainWindow: RiverMonitoring.Window
}

contextBridge.exposeInMainWorld("systemInterface", {
  guiControl: guiControl
})
