const comHandler = require('./comhandler.js')
const mqttHandler = require('./mqtthandler.js')
const httpHandler = require('./httphandler.js')
const mqttMessaging = require('./mqttmessaging.js')

const DEFAULT_TOPIC = "esiot-2023";
const DEFAULT_WLM_PING_TIMING = 1500;
const DEFAULT_PING_TIMEOUT = 2500;

// ---------- CREAZIONE SESSIONE SERIAL ----------

let path = null;

/**
 * Initializes a COM session.
 */
async function initSerialSession() {
  console.log("Initializing serial session");
  let result = new Array();
  console.log("Scanning for Arduino devices...");
  do {
    result = await comHandler.serialComunicationManager.listConnectedDevices();
    if (result.length == 0) {
      console.log("Please connect an arduino to proceed with server initialization");
      await new Promise(resolve => setTimeout(resolve, 2500));
    }
  } while (result.length == 0);
  console.log("Arduino found!")
  path = result[0];
  
  let index = comHandler.serialComunicationManager.generateComSession(path, 115200, () => {
    console.log("Serial connection OK");
  }, () => {
    console.log("Wellness check");
  });

  comHandler.serialComunicationManager.startComSession(index);
  comReady = true;
  triggerStateChange();
}

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
let fact = new mqttMessaging.MQTTMessageFactory();

function loop() {
  let espCheck = messageList.at(-1); // Index -1 refers to the last item in the array
  
  if(espCheck != undefined) {
    let waterLevel = parseFloat(espCheck.split(" ")[1]);

    if (waterLevel >= waterLevelThresholds.WL1
        && waterLevel <= waterLevelThresholds.WL2) {
      currentState = systemStates.NORMAL;
      wlm.sendMessage(topic, fact.makeData("New frequency: F1"));
      serialComunicationManager.sendMessageToComSession(index, "Valve opening: 25%");
    }

    if (waterLevel < waterLevelThresholds.WL1) {
      currentState = systemStates.ALARM_TOO_LOW;
      serialComunicationManager.sendMessageToComSession(index, "Valve opening: 0%");
    }

    if (waterLevel > waterLevelThresholds.WL2) {
      wlm.sendMessage(topic, fact.makeData("New frequency: F2"));
      
      if (waterLevel <= waterLevelThresholds.WL3) {
          currentState = systemStates.PRE_ALARM_TOO_HIGH;
      }
        
      if (waterLevel > waterLevelThresholds.WL3
          && waterLevel <= waterLevelThresholds.WL4) {
        currentState = systemStates.ALARM_TOO_HIGH;
        serialComunicationManager.sendMessageToComSession(index, "Valve opening: 50%");
      }
        
      if (waterLevel > waterLevelThresholds.WL4) {
        currentState = systemStates.ALARM_TOO_HIGH_CRITIC;
        serialComunicationManager.sendMessageToComSession(index, "Valve opening: 100%");
      }
    }

    console.log(currentState);
  }
}

// SERVER INIT

let mqttServer = null;
let httpServer = null;
let comReady = false;
let mqttReady = false;
let httpReady = false;
let messageList = new Array();
let wlm = new mqttHandler.SimpleMQTTConnection();

async function initMQTTServer() {
  mqttServer = new mqttHandler.SimpleMQTTServer();
  mqttServer.start();
}

function initMQTTClient() {
  wlm.connect();
  wlm.subscribeToTopic(DEFAULT_TOPIC);
  wlm.addMessageTopicListener((DEFAULT_TOPIC, message) => {
    messageList.push(new TextDecoder().decode(message));
  });
  wlm.addConnectListener(() => {
    mqttReady = true;
    triggerStateChange();
  })
}

function initHTTPServer() {
  httpServer = new httpHandler.SimpleHTTPServer();
  httpServer.start(() => {
    httpReady = true;
    triggerStateChange();
  });
  httpServer.addEventListener("GET", (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(
      {
        statuses: [
          {
            name:"Water Level Monitor",
            isActive:wlmResponding
          },
          {
            name:"Water Channel Controller",
            isActive:false
          }
        ]
      }
    ));
  });
}

function printSpacer() {
  console.log("==========================");
}

async function initServer() {
  printSpacer();
  console.log(" CTRL + C to kill server");
  printSpacer();
  console.log("==\tServer Init\t==");
  printSpacer();
  await initSerialSession();
  initMQTTServer();
  initMQTTClient();
  initHTTPServer();
  let tmpFactory = new mqttMessaging.MQTTMessageFactory();
}

/**
 * Determines if the server should ping the water level monitor.
 */
let wlmPing = false;
/**
 * Determines if there is a ping that needs to be answered.
 */
let wlmPingValid = false;
/**
 * Timestamp of the last ping message.
 */
let wlmPingSentTime = null;
/**
 * Determines if the water level monitor is responding to pings.
 */
let wlmResponding = false;
function wlmPostInit() {
  wlm.addMessageTopicListener((topic, message) => {
    if (topic == DEFAULT_TOPIC) {
      if (mqttMessaging.MessageParser.isPong(
          new TextDecoder().decode(message))) {
        wlmPingValid = false;
        wlmPingSentTime = null;
        wlmResponding = true;
      }
    }
  });
  let pingMessage = new mqttMessaging.MQTTMessageFactory().makePing();
  setInterval(() => {
    if (wlmPingValid) {
      let timeDiff = (new Date() - wlmPingSentTime);
      if (timeDiff >= DEFAULT_PING_TIMEOUT) {
        wlmPingValid = false;
        wlmResponding = false;
      }
      return;
    }
    if (wlmPing) {
      wlm.sendMessage(DEFAULT_TOPIC, pingMessage);
      wlmPingValid = true;
      wlmPingSentTime = new Date();
    }
  }, DEFAULT_WLM_PING_TIMING);
  wlmPing = true;
}

let wccPostInit;
function wccPostInit() {
  
}

function postInit() {
  wlmPostInit();
  wccPostInit();
}

async function triggerStateChange() {
  console.log("Everything ready!");
  if (comReady && mqttReady && httpReady) {
    await new Promise(resolve => setTimeout(resolve, 2500));
    postInit();
    console.clear();
    printSpacer();
    console.log(" CTRL + C to kill server");
    printSpacer();
  }
}

initServer();
