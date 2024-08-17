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
    CREATE_CONNECTION:      "mqtt-connection-create",
    DESTROY_CONNECTION:     "mqtt-connection-destroy",
    OPEN_CONNECTION:        "mqtt-connection-open",
    CLOSE_CONNECTION:       "mqtt-connection-close",
    SUBSCRIBE_TOPIC:        "mqtt-connection-topic-subscribe",
    UNSUBSCRIBE_TOPIC:      "mqtt-connection-topic-unsubscribe",
    CONNECTION_EVT:         "mqtt-connection-listener-connect-add",
    RECONNECT_EVT:          "mqtt-connection-listener-reconnect-add",
    MESSAGE_EVT:            "mqtt-connection-listener-message-add",
    DISCONNECT_EVT:         "mqtt-connection-listener-disconnect-add",
    ERROR_EVT:              "mqtt-connection-listener-error-add"
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
  register: (key, action) => ipcRenderer.on(key, (arguments) => action(arguments)),
  invoke: (key, arguments) => ipcRenderer.invoke(key, arguments)
});
