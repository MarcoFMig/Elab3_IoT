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

const mqttApi = {
  consts: {
    OPEN_CONNECTION: "mqtt-connection-open",
    CLOSE_CONNECTION: "mqtt-connection-open",
    CONNECTION_ERROR: "mqtt-connection-error",
    MESSAGE_RECIEVED: "mqtt-message-recieved",
    SEND_MESSAGE: "mqtt-send-message"
  },
  Data: class MQTTData {
    constructor(id, hostname) {
      this.id = id;
      this.hostname = hostname;
    }
  }
}

contextBridge.exposeInMainWorld("systemInterface", {
  guiConsts: guiConsts,
  guiControl: guiControl,
  mqttApi: mqttApi
});
contextBridge.exposeInMainWorld("mainCommunicator", {
  fire: (key, arguments) => ipcRenderer.send(key, arguments),
  register: (key, action) => ipcRenderer.on(key, (arguments) => action(arguments))
});
