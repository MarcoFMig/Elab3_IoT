const comHandler = require('./comhandler.js');
const mqttHandler = require('./mqtthandler.js');
const httpHandler = require('./httphandler.js');
const mqttMessaging = require('./mqttmessaging.js');
const comMessaging = require('./commessaging.js');

const DEFAULT_TOPIC = "esiot-2023";
const DEFAULT_WLM_PING_TIMING = 1500;
const DEFAULT_PING_TIMEOUT = 2500;
const DEFAULT_WATER_LEVEL_TREND_CAP = 65535;
const DEFAULT_WATER_LEVEL_TREND_PURGE = 250;

const samplingFrequencies = {
  F1: 60,
  F2: 6
}

let wlm = new mqttHandler.SimpleMQTTConnection();

let path = null;

let softManualOverride = false;
let firstValveDetection = true;
let serialSessionIndex = null;
let percievedValveStatus = null;
let intendedValveStatus = null;
let samplingFrequency = null;

function updateSamplingFrequency(newFrequency) {
  try {
    let parsedValue = Number.parseInt(newFrequency);
    if (Object.values(samplingFrequencies).includes(parsedValue)) {
      let messageFactory = new mqttMessaging.MQTTMessageFactory();
      let messageToSend = messageFactory.makeData(mqttMessaging.DataTypes.SAMPLING_FREQUENCY + mqttMessaging.DEFAULT_ASSIGNER + parsedValue);
      samplingFrequency = parsedValue;
      wlm.sendMessage(DEFAULT_TOPIC, messageToSend);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
}

function updateIntendedValveFlow(newFlow) {
  intendedValveStatus = Number.parseInt(newFlow);
  comHandler.serialComunicationManager.sendMessageToComSession(serialSessionIndex,
    comMessaging.MessageFactory.generateValveCommand(newFlow),
  (error) => console.log("Error while communicating with arduino"));
}

function updatePercievedValveFlow(newFlow) {
  if (firstValveDetection) {
    updateIntendedValveFlow(newFlow);
    firstValveDetection = false;
  }
  percievedValveStatus = Number.parseInt(newFlow);
}

// Da cambiare con valori sensati
const waterLevelThresholds = {
  WL1 : 0,
  WL2 : 1,
  WL3 : 2,
  WL4 : 3,
}

const systemStates = {
  NORMAL : "NORMAL",
  ALARM_TOO_LOW : "ALARM_TOO_LOW",
  PRE_ALARM_TOO_HIGH : "PRE_ALARM_TOO_HIGH",
  ALARM_TOO_HIGH : "ALARM_TOO_HIGH",
  ALARM_TOO_HIGH_CRITIC : "ALARM_TOO_HIGH_CRITIC"
}

let currentState = systemStates.NORMAL;

async function generalUpdate(waterLevel) {
  let valve = null;
  let frequency = null;

  if (waterLevel >= waterLevelThresholds.WL1
      && waterLevel <= waterLevelThresholds.WL2) {
    currentState = systemStates.NORMAL;
    frequency = 6;
    valve = 25;
  }

  if (waterLevel < waterLevelThresholds.WL1) {
    currentState = systemStates.ALARM_TOO_LOW;
    valve = 0;
  }

  if (waterLevel > waterLevelThresholds.WL2) {
    frequency = 60;
    
    if (waterLevel <= waterLevelThresholds.WL3) {
        currentState = systemStates.PRE_ALARM_TOO_HIGH;
    }
      
    if (waterLevel > waterLevelThresholds.WL3
        && waterLevel <= waterLevelThresholds.WL4) {
      currentState = systemStates.ALARM_TOO_HIGH;
      valve = 50;
    }
      
    if (waterLevel > waterLevelThresholds.WL4) {
      currentState = systemStates.ALARM_TOO_HIGH_CRITIC;
      valve = 100;
    }
  }

  updateIntendedValveFlow(valve);
  updateSamplingFrequency(frequency);
}

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
  
  let index = comHandler.serialComunicationManager.generateComSession(path, 9600, () => {
    console.log("Serial connection OK");
  }, (data) => {
    //console.log("Recieved: " + data.charCodeAt(0).toString(2), data.charCodeAt(1).toString(2));
    let characters = [data.charCodeAt(0), data.charCodeAt(1)];
    let currentMessage = comMessaging.MessageParser.parseMessage(characters);
    if (currentMessage == false) {
      return;
    }
    if (currentMessage.messageType == comMessaging.MessageTypes.DATA) {
      if (currentMessage.contentType == comMessaging.DataTypes.VALVE_FLOW) {
        updatePercievedValveFlow(currentMessage.content);
      }
    }
  });

  comHandler.serialComunicationManager.startComSession(index);
  comReady = true;
  serialSessionIndex = index;
  triggerStateChange();
}

// SERVER INIT

let mqttServer = null;
let httpServer = null;
let comReady = false;
let mqttReady = false;
let httpReady = false;
let waterLevelTrend = new Array();

async function initMQTTServer() {
  mqttServer = new mqttHandler.SimpleMQTTServer();
  mqttServer.start();
}

function initMQTTClient() {
  wlm.connect();
  wlm.subscribeToTopic(DEFAULT_TOPIC);
  wlm.addMessageTopicListener((DEFAULT_TOPIC, message) => {
    let data = mqttMessaging.MessageParser.parseMessage(new TextDecoder().decode(message));
    if (data) {
      if (data.has(mqttMessaging.DataTypes.WATER_LEVEL_INFO)) {
        let waterLevelData = new mqttMessaging.WaterReadData(new Date(), Number.parseFloat(data.get(mqttMessaging.DataTypes.WATER_LEVEL_INFO)));
        waterLevelTrend.push(waterLevelData);
        if (waterLevelTrend.length > DEFAULT_WATER_LEVEL_TREND_CAP) {
          waterLevelTrend.slice(-DEFAULT_WATER_LEVEL_TREND_PURGE);
        }
        generalUpdate(waterLevelData);
      }
    }
    return
  });

  wlm.addConnectListener(() => {
    mqttReady = true;
    triggerStateChange();
  })
}

function makeSimpleResponse(message, code) {
  return JSON.stringify(
    {
      status: message,
      code: code
    })
}

function updateSoftManualOverride(override) {
  softManualOverride = override;
}

function initHTTPServer() {
  httpServer = new httpHandler.SimpleHTTPServer();
  httpServer.start(() => {
    httpReady = true;
    triggerStateChange();
  });
  httpServer.addEventListener("GET", (request, response) => {
    let parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    response.writeHead(200, { 'Content-Type': 'application/json' });
    if (parsedUrl.searchParams.has("operationType") && parsedUrl.searchParams.get("operationType") == "connectionCheck") {
      response.end(JSON.stringify({
        status: "ok",
        code: 200
      }));
      return;
    }
    let wltToSend = waterLevelTrend;
    if (parsedUrl.searchParams.has("timeWindowMinutes")) {
      let timeWindow = Number.parseInt(parsedUrl.searchParams.get("timeWindowMinutes"));
      if (!isNaN(timeWindow)) {
        let timeLimit = new Date();
        timeLimit.setMinutes(timeLimit.getMinutes() - timeWindow);
        wltToSend = wltToSend.filter(
          capture => capture.timestamp >= timeLimit
        );
      }
    }
    response.end(JSON.stringify(
      {
        status: "ok",
        code: 200,
        systemStatus: currentState,
        devices: {
          water_level_monitor: {
            status: wlmResponding,
            samplingFrequency: samplingFrequency,
            waterLevelTrend: wltToSend
          },
          water_channel_controller: {
            status: false,
            softManualOverride: softManualOverride,
            intendedValveOpening: intendedValveStatus,
            percievedValveOpening: percievedValveStatus
          }
        }
      }
    ));
  });
  httpServer.addEventListener("POST", (request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    let parsedUrl = new URL(request.url, `http://${request.headers.host}`);
    let urlParams = parsedUrl.searchParams;
    if (!(urlParams.has("operation") && urlParams.has("value"))) {
      response.end(makeSimpleResponse("Malformed request", 400));
      return;
    }
    let operationType = urlParams.get("operation");
    let operationValue = urlParams.get("value");
    switch (operationType) {
      case "valveOpening":
        updateIntendedValveFlow(operationValue);
      break;
      case "changeFrequency":
        if (!updateSamplingFrequency(operationValue)) {
          response.end(makeSimpleResponse("Incorrect frequency set", 406));
          return;
        }
      break;
      case "setManual":
        if (!updateSoftManualOverride(operationValue)) {
          response.end(makeSimpleResponse("Server error", 500));
          return;
        }
      break;
      default:
        response.end(makeSimpleResponse("Invalid operation", 400));
        return;
    }
    response.end(makeSimpleResponse("done", 200));
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

/*let wccStatus;
function wccPostInit() {
  setInterval(() => {
    comHandler.serialComunicationManager.sendMessageToComSession(serialSessionIndex,
      comMessaging.MessageFactory.generatePing());
      console.log("ping");
  }, DEFAULT_WLM_PING_TIMING);
}*/

function postInit() {
  wlmPostInit();
  //wccPostInit();
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
