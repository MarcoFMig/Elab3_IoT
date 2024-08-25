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
			path:this.path.path,
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

	sendMessageToComSession: (sessionId, data, errorHandler = null) => {
		comSessions[sessionId].sendMessage(data, errorHandler)
	}
}

// ---------- CREAZIONE CLIENT MQTT ----------

const topic = "esiot-2023";
let messageList = new Array();
let wlm = new SimpleMQTTConnection("mqtt://broker.mqtt-dashboard.com:1883");

wlm.connect();
wlm.subscribeToTopic(topic);
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

// ---------- CREAZIONE SESSIONE SERIAL ----------

let path = null;

/**
 * Initializes a COM session.
 */
async function initSerialSession() {
  console.log("Initializing serial session");
  let result = new Array();
  do {
    console.log("Scanning for Arduino devices...");
    result = await serialComunicationManager.listConnectedDevices();
    if (result.length == 0) {
      console.log("Please connect an arduino to proceed with server initialization");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } while (result.length == 0);
  console.log("Arduino found!")
  path = result[0];
  
  let index = serialComunicationManager.generateComSession(path, 115200, () => {
    console.log("Serial connection OK");
  }, () => {
    console.log("Wellness check");
  });

  serialComunicationManager.startComSession(index);
}

initSerialSession();

// ---------- MAIN SYSTEM ----------
// Da cambiare con valori sensati
const waterLevelThresholds = {
  WL1 : 0,
  WL2 : 1,
  WL3 : 2,
  WL4 : 3,
}

const systemStates = {
  NORMAL : "normal",
  ALARM_TOO_LOW : "too low",
  PRE_ALARM_TOO_HIGH : "pre too high",
  ALARM_TOO_HIGH : "too high",
  ALARM_TOO_HIGH_CRITIC : "too high critic"
}

let currentState = null;

function loop() {
  let espCheck = messageList.pop();
  
  if(espCheck != undefined) {
    let waterLevel = parseFloat(espCheck.split(" ")[1]);

    if (waterLevel >= waterLevelThresholds.WL1
        && waterLevel <= waterLevelThresholds.WL2) {
      currentState = systemStates.NORMAL;
      wlm.sendMessage(topic, "New frequency: F1");
      serialComunicationManager.sendMessageToComSession(index, "Valve opening: 25%");
    }

    if (waterLevel < waterLevelThresholds.WL1) {
      currentState = systemStates.ALARM_TOO_LOW;
      serialComunicationManager.sendMessageToComSession(index, "Valve opening: 0%");
    }

    if (waterLevel > waterLevelThresholds.WL2) {
      wlm.sendMessage(topic, "New frequency: F2");
      
      if (waterLevel <= waterLevelThresholds.WL3) {
          currentState = systemStates.PRE_ALARM_TOO_HIGH;
      }
        
      if (waterLevel > waterLevelThresholds.WL3
          && waterLevel <= waterLevelThresholds.WL4) {
        currentState = systemStates.ALARM_TOO_HIGH;
        wlm.sendMessage(topic, "New frequency: F2");
        serialComunicationManager.sendMessageToComSession(index, "Valve opening: 50%");
      }
        
      if (waterLevel > waterLevelThresholds.WL4) {
        currentState = systemStates.ALARM_TOO_HIGH_CRITIC;
        wlm.sendMessage(topic, "New frequency: F2");
        serialComunicationManager.sendMessageToComSession(index, "Valve opening: 100%");
      }
    }

    console.log(currentState);
  }
}