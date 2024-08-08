const { contextBridge, ipcRenderer, remote } = require('electron')

const guiConsts = {
  windowActions: {
    CLOSE_WINDOW: "wclose",
    ENLARGE_WINDOW: "wenlarge",
    NORMALIZE_WINDOW: "wminimize",
    MINIMIZE_WINDOW: "wminimize"
  }
}

const guiControl = {
  performAction: (action) => {
    switch(action) {
      case guiConsts.windowActions.CLOSE_WINDOW:
        remote.BrowserWindow.getFocusedWindow().minimize();
        break;
      case guiConsts.windowActions.ENLARGE_WINDOW:
        remote.BrowserWindow.getFocusedWindow().setFullScreen(true);
        break;
      case guiConsts.windowActions.NORMALIZE_WINDOW:
        remote.BrowserWindow.getFocusedWindow().setFullScreen(false);
        break;
      case guiConsts.windowActions.MINIMIZE_WINDOW:
        remote.BrowserWindow.getFocusedWindow().minimize();
        break;
    }
  }
}

contextBridge.exposeInMainWorld("systemInterface", {
  guiConsts: guiConsts,
  guiControl: guiControl
});
contextBridge.exposeInMainWorld("mainCommunicator", {
  fire: (key, arguments) => ipcRenderer.send(key, arguments)
});
