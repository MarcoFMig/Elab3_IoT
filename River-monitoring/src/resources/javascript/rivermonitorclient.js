let trafficDashboardIcon = null;
let connectivityDashboardIcon = null;

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

let riverMonitorConnectionPod = null;
let waterLevelHistory = new Array();
let wlm = new WaterLevelMonitor("mqtt://broker.mqtt-dashboard.com:1883");
let messageFactory = new MQTTMessageFactory();

async function initRiverMonitorComms(addressBox, connectionPod) {
  let address = new URL(`https://${addressBox.value}:8123`);
  address.searchParams.append("operation", "connectioncheck");
  let result = await fetch(address);
  if (result.status != 200) {

  }
  let inboundText = JSON.parse(await result.text());
  if (inboundText.code == 200) {
    globalValues.pillboxManager.detachPillbox(connectionPod);
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
  riverMonitorAddressInsertion.placeholder = "xxx.xxx.xxx.xxx";
  riverMonitorAddressInsertion.type = 'text';
  riverMonitorAddressInsertion.style.width = "80%";
  let riverMonitorPodStartConnBtn = document.createElement('button');
  riverMonitorPodStartConnBtn.innerHTML = "Connect"
  riverMonitorPodStartConnBtn.style.width = "100%";
  riverMonitorPodStartConnBtn.onclick = () => initRiverMonitorComms(riverMonitorAddressInsertion, riverMonitorConnectionPod);
  let riverMonitorPodContent = document.createElement("div");
  riverMonitorPodContent.appendChild(riverMonitorPodText);
  riverMonitorPodContent.appendChild(riverMonitorAddressInsertion);
  riverMonitorPodContent.appendChild(riverMonitorPodStartConnBtn);
  riverMonitorConnectionPod = new podUi.Pillbox("Connect to River Monitoring Service", riverMonitorPodContent);
  globalValues.pillboxManager.attachPillbox(riverMonitorConnectionPod);
}

function setupIndicators() {
  wlm.addConnectListener(() => {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-green.svg"
  });
  wlm.addDisconnectListener(() => {
    connectivityDashboardIcon.src = "./resources/images/vector/network-icon-red.svg"
  })
  wlm.addTrafficListener(async () => {
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-green.svg";
    await new Promise(r => setTimeout(r, 100));
    trafficDashboardIcon.src = "./resources/images/vector/traffic-icon-white.svg";
  });
}

function initRiverMonitorClient() {
  gatherRequiredElements();
  generateControlPod();
  setupIndicators();
}
