const DEFAULT_UPDATE_INTERVAL_MS = 2500;

let trafficDashboardIcon = null;
let connectivityDashboardIcon = null;

class WaterLevelData {
  constructor(timestamp, reading) {
    this.timestamp = timestamp;
    this.reading = reading;
  }
}

class WaterLevelMonitor {
  connectListeners = new Array();
  reconnectListeners = new Array();
  messageListeners = new Array();
  disconnectListeners = new Array();
  errorListeners = new Array();
  trafficListeners = new Array();
  subscribedTopics = new Map();

  constructor(broker) {
    this.broker = broker;
    this.connected = false;
    this.identifier = null;
    this.init();
  }
  init() {
    let opResult = 0;
    let errorText = "Error occourred while attempting to connect!";
    this.identifier = window.mqttApi.createConnection(this.broker);
    opResult = window.mqttApi.addConnectListener(this.identifier, () => {
      this.connectListeners.forEach(listener => listener());
    });
    if (opResult != 0) {
      throw new Error(errorText);
    }
    opResult = window.mqttApi.addReconnectListener(this.identifier, () => {
      this.reconnectListeners.forEach(listener => listener());
    });
    if (opResult != 0) {
      throw new Error(errorText);
    }
    opResult = window.mqttApi.addDisconnectListener(this.identifier, () => {
      this.disconnectListeners.forEach(listener => listener());
    });
    if (opResult != 0) {
      throw new Error(errorText);
    }
    opResult = window.mqttApi.addErrorListener(this.identifier, () => {
      this.errorListeners.forEach(listener => listener());
    });
    if (opResult != 0) {
      throw new Error(errorText);
    }
    opResult = window.mqttApi.addMessageTopicListener(this.identifier, (topic, message, packet) => {
      this.trafficListeners.forEach(listener => listener());
      this.messageListeners.forEach(listener => listener(topic, message, packet));
    });
    if (opResult != 0) {
      throw new Error(errorText);
    }
  }
  connect() {
    return window.mqttApi.connect(this.identifier);
  }
  disconnect() {
    return window.mqttApi.disconnect(this.identifier);
  }
  destroy() {
    return window.mqttApi.destroyConnection(this.identifier);
  }
  subscribeToTopic(topicName) {
    return window.mqttApi.subscribeToTopic(this.identifier, topicName);
  }
  unsubscribeToTopic() {
    return window.mqttApi.unsubscribeToTopic(this.identifier, topicName);
  }
  sendMessage(topic, message) {
    this.trafficListeners.forEach(listener => listener());
    return window.mqttApi.sendMessage(this.identifier, topic, message)
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
  addTrafficListener(listener) {
    this.trafficListeners.push(listener);
  }
}

class MQTTMessageFactory {
  constructor(prefix = "RMS", separator = "-") {
    this.prefix = prefix;
    this.separator = separator;
  }
  prefixMessage(message) {
    return this.prefix + this.separator + message;
  }
  getPrefix() {
    return this.prefix;
  }
  getSeparator() {
    return this.separator;
  }
}

let riverMonitor = null;

const riverMonitorClientConsts = {
  topic: "esiot-2023"
}

let riverMonitorServerAddress = null;
let riverMonitorConnectionPod = null;
//let wlm = new WaterLevelMonitor("mqtt://broker.mqtt-dashboard.com:1883");
let messageFactory = new MQTTMessageFactory();
let waterLevelTrend = new Array();

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

function getRiverMonitorServerAddress() {
  return new URL(riverMonitorServerAddress.toString());
}

async function processIncomingData(data) {
  waterLevelTrend = data.devices.water_level_monitor.waterLevelTrend;
  console.log(waterLevelTrend);

  let waterLevel = waterLevelTrend.at(-1).data;
  console.log(waterLevel);

  let valveCopy = getRiverMonitorServerAddress();
  let sampleCopy = getRiverMonitorServerAddress();

  valveCopy.searchParams.set("operationType", "valveOpening");
  sampleCopy.searchParams.set("operationType", "changeFrequency");

  if (waterLevel == undefined) {
    return;
  }

  if (waterLevel >= waterLevelThresholds.WL1
      && waterLevel <= waterLevelThresholds.WL2) {
    currentState = systemStates.NORMAL;
    sampleCopy.searchParams.set("value", 1);
    valveCopy.searchParams.set("value", 25);
  }

  if (waterLevel < waterLevelThresholds.WL1) {
    currentState = systemStates.ALARM_TOO_LOW;
    valveCopy.searchParams.set("value", 0);
  }

  if (waterLevel > waterLevelThresholds.WL2) {
    sampleCopy.searchParams.set("value", 2);
    
    if (waterLevel <= waterLevelThresholds.WL3) {
        currentState = systemStates.PRE_ALARM_TOO_HIGH;
    }
      
    if (waterLevel > waterLevelThresholds.WL3
        && waterLevel <= waterLevelThresholds.WL4) {
      currentState = systemStates.ALARM_TOO_HIGH;
      valveCopy.searchParams.set("value", 50);
    }
      
    if (waterLevel > waterLevelThresholds.WL4) {
      currentState = systemStates.ALARM_TOO_HIGH_CRITIC;
      valveCopy.searchParams.set("value", 100);
    }
  }

  let valveRequest = await fetch(valveCopy, {
    method: "POST"
  });

  let sampleRequest = await fetch(sampleCopy, {
    method: "POST"
  });

  if (valveRequest.status != 200 || sampleRequest.status != 200) {
    // TODO: Something here
  }

  console.log(currentState);
}

let requestBusy = false;
let trafficBusy = false;
let connectionActive = false;
async function postConnectionInit() {
  setInterval(async () => {
    if (!requestBusy) {
      requestBusy = true;
      setTrafficOn(true);
      let request = await fetch(riverMonitorServerAddress);
      if (request.status != 200) {
        // TODO: Something here
      }
      let content = JSON.parse(await request.text());
      processIncomingData(content);
      setTrafficOn(false);
      requestBusy = false;
    } else {
      return;
    }
  }, DEFAULT_UPDATE_INTERVAL_MS);
}

async function initRiverMonitorComms(addressBox, connectionPod) {
  if (addressBox.value == "") {
    return;
  }
  let address = new URL(`http://${addressBox.value}:8123`);
  address.searchParams.append("operation", "connectioncheck");
  let result = await fetch(address);
  if (result.status != 200) {
    // TODO: SOMETHING HERE
  }
  let inboundText = JSON.parse(await result.text());
  if (inboundText.code == 200) {
    globalValues.pillboxManager.detachPillbox(connectionPod);
    setConnectionActive(true);
    riverMonitorServerAddress = new URL(`http://${addressBox.value}:8123`);
    await postConnectionInit();
  }
}

function gatherRequiredElements() {
  trafficDashboardIcon = document.getElementById("ui-header-traffic-icon");
  connectivityDashboardIcon = document.getElementById("ui-header-connectivity-icon");
}

function generateControlPod() {
  let riverMonitorPodText = document.createElement("p");
  riverMonitorPodText.innerHTML = "Insert the address for a River Monitoring Service";
  let riverMonitorAddressInsertion = document.createElement('input');
  riverMonitorAddressInsertion.id = "ip-insertion-bar";
  riverMonitorAddressInsertion.placeholder = "xxx.xxx.xxx.xxx";
  riverMonitorAddressInsertion.type = 'text';
  let riverMonitorPodStartConnBtn = document.createElement('button');
  riverMonitorPodStartConnBtn.innerHTML = "Connect"
  riverMonitorPodStartConnBtn.style.width = "100%";
  riverMonitorPodStartConnBtn.onclick = () => initRiverMonitorComms(riverMonitorAddressInsertion, riverMonitorConnectionPod);
  let riverMonitorPodContent = document.createElement("div");
  riverMonitorPodContent.appendChild(riverMonitorPodText);
  riverMonitorPodContent.appendChild(riverMonitorAddressInsertion);
  riverMonitorPodContent.appendChild(riverMonitorPodStartConnBtn);
  riverMonitorPodContent.id = "container-ip-insertion";
  riverMonitorConnectionPod = new podUi.Pillbox("Connect to River Monitoring Service", riverMonitorPodContent);
  globalValues.pillboxManager.attachPillbox(riverMonitorConnectionPod);
}

async function setTrafficOn(traffic) {
  trafficBusy = traffic;
  if (traffic) {
    await new Promise(r => setTimeout(r, 100));
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-green.svg";
  } else {
    await new Promise(r => setTimeout(r, 200));
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-white.svg";
  }
}
async function setConnectionActive(active) {
  connectionActive = active;
  if (active) {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-green.svg"
  } else {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-red.svg"
  }
}

function setupIndicators() {
  /*wlm.addConnectListener(() => {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-green.svg"
  });
  wlm.addDisconnectListener(() => {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-red.svg"
  })
  wlm.addTrafficListener(async () => {
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-green.svg";
    await new Promise(r => setTimeout(r, 100));
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-white.svg";
  });*/
}

function initRiverMonitorClient() {
  gatherRequiredElements();
  generateControlPod();
  setupIndicators();
}
