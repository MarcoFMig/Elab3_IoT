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

// MQTT Handling
let mqttConnections = new Map();
let mqttConnectionsLastIndex = 0;
let freeIndexes = new Array();

function requestNewIndex() {
  let returnIndex = null;
  if (freeIndexes.length > 0) {
    returnIndex = freeIndexes.pop();
  } else {
    returnIndex = mqttConnectionsLastIndex
    mqttConnectionsLastIndex;
  }
  return returnIndex;
}
function freeIndex(index) {
  freeIndexes.push(index);
}

class SimpleMQTTConnection {
  constructor(address) {
    this.address = address;
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
  }
  connect() {
    this.connection = mqtt.connect(this.address, this.options);
    this.connection.on('error', (err) => {
      console.log('Connection error: ', err)
      this.connection.end()
    })
    this.connection.on('connect', () => {
      console.log('Client connected:' + this.options.clientId)
      this.connection.subscribe(this.options.will.topic, () => console.log("test"));
    })
    this.connection.on('reconnect', () => {
      console.log('Reconnecting...')
    })
    this.connection.on('message', (topic, message, packet) => {
      console.log(
        'Received Message: ' + message.toString() + '\nOn topic: ' + topic
      )
    })
  }
  disconnect() {
    this.connection.end();
    this.connection = null;
  }
}

class MQTTData {
  constructor(id, hostname) {
    this.id = id;
    this.hostname = hostname;
  }
}

ipcMain.on("mqtt-connection-open", (theme, arguments) => {
  let requestedIndex = requestNewIndex();
  mqttConnections[requestedIndex] = new SimpleMQTTConnection(arguments);
  mqttConnections[requestedIndex].connect();
});
function postWindowCreation() {
  //let k = new window.systemInterface.mqttApi.Data(1, 1);
}
