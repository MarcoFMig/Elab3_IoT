const { contextBridge } = require('electron');
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
  constructor(address, identifier) {
    this.address = address;
    this.identifier = identifier;
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
  sendMessage(topic, message) {
    this.connection.publish(topic, message, {
      qos: this.options.will.qos,
      retain: false
    });
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

function safeExecution(identifier, operation) {
  if (mqttConnections.has(identifier)) {
    let opRes = operation();
    if (opRes == null) {
      return 0;
    } else {
      return opRes;
    }
  } else {
    return -1;
  }
}

contextBridge.exposeInMainWorld("mqttApi", {
  createConnection: (broker) => {
    let requestedIndex = requestNewIndex();
    mqttConnections.set(requestedIndex, new SimpleMQTTConnection(broker, requestedIndex));
    return requestedIndex;
  },
  connect: (identifier) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).connect();
    });
  },
  disconnect: (identifier) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).disconnect();
    });
  },
  sendMessage: (identifier, topic, message) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).sendMessage(topic, message);
    })
  },
  destroyConnection: (identifier) => {
    return safeExecution(identifier, () => {
      if (mqttConnections.get(identifier).connectionValid) {
        mqttConnections.get(identifier).disconnect();
      }
      mqttConnections.delete(identifier);
      freeIndex(identifier);
    });
  },
  subscribeToTopic: (identifier, topicName) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).subscribeToTopic(topicName);
    });
  },
  unsubscribeToTopic: (identifier, topicName) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).unsubscribeToTopic(topicName);
    });
  },
  addConnectListener: (identifier, listener) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).addConnectListener(listener);
    });
  },
  addReconnectListener: (identifier, listener) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).addReconnectListener(listener);
    });
  },
  addMessageTopicListener: (identifier, listener) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).addMessageTopicListener(listener);
    });
  },
  addDisconnectListener: (identifier, listener) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).addDisconnectListener(listener);
    });
  },
  addErrorListener: (identifier, listener) => {
    return safeExecution(identifier, () => {
      mqttConnections.get(identifier).addErrorListener(listener);
    });
  }
});
