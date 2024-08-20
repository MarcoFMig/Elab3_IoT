const http = require("http");
const mqtt = require('mqtt');
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

// MQTT PART

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

// SERIAL COM PART

let comSessions = []

/**
 * Checks if a string starts with any of the strings passed.
 * @param {*} str the string to check
 * @param {*} substrs a set of starting points
 * @returns returns true if any of the substrings are
 * 			present at the start of the given string
 */
function stringStartsWith(string, stringSet) {
	return stringSet.some(substr => string.startsWith(substr));
}

class COMSession {
	constructor(path, baudrate, openFunc, dataFunc) {
		this.path = path
		this.baudrate = baudrate
		this.openFunc = openFunc
		this.dataFunc = dataFunc
	}

	startConnection() {
		this.serialConnPort = new SerialPort({
			path:this.path,
			baudRate:this.baudrate
		})

		const dataParser = this.serialConnPort.pipe(new ReadlineParser({delimiter: '\n'}));
		
    this.serialConnPort.on("open", () => {
      this.openFunc();
    });

		dataParser.on('data', (data) =>{
			this.dataFunc(data);
		});
	}
	
	sendMessage(data, errorHandler) {
		this.serialConnPort.write(data, function(error) {
			if (error) {
			  return console.log('Error on write: ', err.message);
			}
		})
	}
}

// END COM PART

// ---------- CREAZIONE DEL SERVER HTTP ----------

const host = 'localhost';
const port = 8123;

const requestListener = function (request, resource) {
  resource.writeHead(200);
  resource.end(JSON.stringify(messageList));
};

const server = http.createServer(requestListener);

server.listen(port, host, () => {
  console.log(`Server is running on http://${host}:${port}`);
});

// ---------- CREAZIONE DEL COM MANAGER ----------

const serialComunicationManager = {
	listConnectedDevices: () => {
		return SerialPort.list()
	},

	generateComSession: (path, baudrate, openFunc, dataFunc) => {
		let sesssion = new COMSession(path, baudrate, openFunc, dataFunc)
		comSessions.push(sesssion)
		return comSessions.indexOf(sesssion)
	},

	startComSession: (sessionId) => {
		comSessions[sessionId].startConnection()
	},

	sendMessageToComSession: (sessionId, data, errorHandler) => {
		comSessions[sessionId].sendMessage(data, errorHandler)
	}
}

// ---------- CREAZIONE CLIENT MQTT ----------

let messageList = new Array();
let wlm = new SimpleMQTTConnection("mqtt://broker.mqtt-dashboard.com:1883");

wlm.connect();
wlm.subscribeToTopic("esiot-2023");
wlm.addMessageTopicListener((topic, message) => {
  messageList.push(new TextDecoder().decode(message));
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
