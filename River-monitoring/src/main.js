const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('node:path');
const mqtt = require('mqtt');

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
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, "./resources/images/river-monitoring.ico")
  })
  mainWindow.loadFile(path.join(__dirname, './index.html'))
  /*mainWindow.on('show', () => {
  });*/
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

  mainWindow.on('show', () => {
    createTrayElement(false);
    postWindowCreation();
  });
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

// MQTT

let mqttConnections = new Map();
let mqttConnectionsLastIndex = 0;
let freeIndexes = new Array();

function requestNewIndex() {
  let returnIndex = null;
  if (freeIndexes.length > 0) {
    returnIndex = freeIndexes.pop();
  } else {
    returnIndex = mqttConnectionsLastIndex
    mqttConnectionsLastIndex++;
  }
  return returnIndex;
}
function freeIndex(index) {
  freeIndexes.push(index);
}

const mqttConsts = {
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
}

class SimpleMQTTConnection {
  constructor(address, index) {
    this.address = address;
    this.index = index;
    this.options = {
      keepalive: 60,
      clientId: 'mqttjs_' + Math.random().toString(16).substr(2, 8),
      protocolId: 'MQTT',
      protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      will: {
        topic: 'esiot-2023',
        payload: 'Connection Closed abnormally..!',
        qos: 0,
        retain: false,
      },
      rejectUnauthorized: false,
    };
    this.connection = null;
    this.connectionValid = false;
  }
  connect() {
    this.connection = mqtt.connect(this.address, this.options);
    this.connection.on('error', (err) => {
      this.connection.end();
      this.connectionValid = false;
      mainWindow.webContents.send(mqttConsts.ERROR_EVT, err);
    })
    this.connection.on('connect', () => {
      this.connectionValid = true;
      this.sendEventName(mqttConsts.CONNECTION_EVT);
    })
    this.connection.on('reconnect', () => {
      this.sendEventName(mqttConsts.RECONNECT_EVT);
    })
    this.connection.on('message', (topic, message, packet) => {
      this.sendEventName(mqttConsts.MESSAGE_EVT, topic, message);
    })
    this.connection.on('end', () => {
      this.connectionValid = false;
      this.sendEventName(mqttConsts.DISCONNECT_EVT);
    })
  }
  sendEventName(event, ...data) {
    mainWindow.webContents.send(event + "-" + this.index, data);
  }
  subscribeToTopic(topic) {
    this.subscribedTopics.set(topic, null);
    this.connection.subscribe(topic, () => console.log("test"));
  }
  unsubscribeToTopic(topic) {
    this.subscribedTopics.delete(topic);
  }
  getSubscribedTopics() {
    return this.subscribedTopics;
  }
  disconnect() {
    this.connection.end();
    this.connection = null;
  }
}

ipcMain.handle("mqtt-connection-create", (event, broker) => {
  let requestedIndex = requestNewIndex();
  mqttConnections[requestedIndex] = new SimpleMQTTConnection(broker, requestedIndex);
  return requestedIndex;
});

ipcMain.handle("mqtt-connection-open", (event, id) => {
  safeExecution(event, id, () => {
    mqttConnections[id].connect();
  });
});

ipcMain.handle("mqtt-connection-destroy", (event, id) => {
  safeExecution(event, id, () => {
    mqttConnections.delete(id);
  });
});
