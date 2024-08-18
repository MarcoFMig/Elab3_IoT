const http = require("http");
const mqtt = require('mqtt');

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
    this.connection.subscribe(topic);
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

const host = 'localhost';
const port = 8123;
let messageList = new Array();
let wlm = new SimpleMQTTConnection("mqtt://broker.mqtt-dashboard.com:1883");
wlm.connect();
wlm.subscribeToTopic("esiot-2023");
wlm.addMessageTopicListener((topic, message) => {
  messageList.push(new TextDecoder().decode(message));
});

const requestListener = function (req, res) {
  res.writeHead(200);
  res.end(JSON.stringify(messageList));
};
const server = http.createServer(requestListener);
server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

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
