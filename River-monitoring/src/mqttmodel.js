// MQTT Handling
const { app, BrowserWindow, ipcMain, Tray, Menu } = require('electron');
const path = require('node:path');
const mqtt = require('mqtt');

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

class SimpleMQTTConnection {
  connectListeners = new Array();
  reconnectListeners = new Array();
  messageListeners = new Array();
  disconnectListeners = new Array();
  errorListeners = new Array();
  subscribedTopics = new Map();
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
    this.connectionValid = false;
  }
  connect() {
    this.connection = mqtt.connect(this.address, this.options);
    this.connection.on('error', (err) => {
      this.connection.end();
      this.connectionValid = false;
    })
    this.connection.on('connect', () => {
      this.connectionValid = true;
      this.connectListeners.forEach(listener => listener());
    })
    this.connection.on('reconnect', () => {
      this.reconnectListeners.forEach(listener => listener())
    })
    this.connection.on('message', (topic, message, packet) => {
      this.messageListeners.forEach(listener => listener(topic, message, packet));
    })
    this.connection.on('end', () => {
      this.connectionValid = false;
      this.disconnectListeners.forEach(listener => listener());
    })
    this.connection.on('error', () => {
      this.connectionValid = false;
      this.errorListeners.forEach(listener => listener());
    })
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
  addConnectListener(listener) {
    this.connectListeners.push(listener);
  }
  addReconnectListener(listener) {
    this.reconnectListeners.push(listener)
  }
  addMessageTopicListener(listener) {
    this.messageListeners.push(listener);
  }
  addDisconnectListener(listener) {
    this.disconnectListeners.push(listener);
  }
  addErrorListener(listener) {
    this.errorListeners.push(listener);
  }
}

class MQTTData {
  constructor(id, hostname) {
    this.id = id;
    this.hostname = hostname;
  }
}

function safeExecution(event, identifier, operation) {
  if (mqttConnections.has(identifier)) {
    operation();
  } else {
    return -1;
  }
}

ipcMain.handle("mqtt-connection-create", (event, broker) => {
  let requestedIndex = requestNewIndex();
  mqttConnections[requestedIndex] = new SimpleMQTTConnection(broker);
  return requestedIndex;
});
ipcMain.handle("mqtt-connection-destroy", (event, id) => {
  safeExecution(event, id, () => {
    mqttConnections.delete(id);
  });
});

ipcMain.handle("mqtt-connection-open", (event, identifier) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].connect();
  });
});

ipcMain.handle("mqtt-connection-close", (event, identifier) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].disconnect();
  });
});

ipcMain.handle("mqtt-connection-topic-subscribe", (event, identifier, topicName) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].subscribeToTopic(topicName);
  });
});

ipcMain.handle("mqtt-connection-topic-unsubscribe", (event, identifier, topicName) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].unsubscribeToTopic(topicName);
  });
});

ipcMain.handle("mqtt-connection-listener-connect-add", (event, identifier, listener) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].addConnectListener(listener);
  });
});

ipcMain.handle("mqtt-connection-listener-reconnect-add", (event, identifier, listener) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].addReconnectListener(listener);
  });
});

ipcMain.handle("mqtt-connection-listener-message-add", (event, identifier, listener) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].addMessageTopicListener(listener);
  });
});

ipcMain.handle("mqtt-connection-listener-disconnect-add", (event, identifier, listener) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].addDisconnectListener(listener);
  });
});

ipcMain.handle("mqtt-connection-listener-error-add", (event, identifier, listener) => {
  safeExecution(event, identifier, () => {
    mqttConnections[identifier].addErrorListener(listener);
  });
});
