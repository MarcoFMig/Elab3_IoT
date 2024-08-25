const aedes = require('aedes')();
const mqtt = require('mqtt');
const net = require('net');

const DEFAULT_MQTT_PORT = 1883;

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

class SimpleMQTTServer {
  constructor(port = DEFAULT_MQTT_PORT, hostname) {
    this.port = port;
    this.hostname = hostname;
  }
  start() {
    this.server = net.createServer(aedes.handle);
    this.server.listen(this.port, this.hostname, () => {
      console.log("MQTT Broker is currently running on port " + this.port);
    })
    aedes.on('client', (client) => {
      console.log(`Client ${(client ? client.id : client)} connected via MQTT`)
    })
  }
}

// MQTT Client
class SimpleMQTTConnection {
  connectListeners = new Array();
  reconnectListeners = new Array();
  messageListeners = new Array();
  disconnectListeners = new Array();
  errorListeners = new Array();
  subscribedTopics = new Map();
  
  //MQTT Connection essential elements
  address;
  connection;
  connectionValid;
  identifier;
  option;

  constructor(address, identifier) {
    this.address = address;
    this.connection = null;
    this.connectionValid = false;
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

// END MQTT PART

module.exports = { SimpleMQTTConnection, SimpleMQTTServer }
