class WaterLevelMonitor {
  connectListeners = new Array();
  reconnectListeners = new Array();
  messageListeners = new Array();
  disconnectListeners = new Array();
  errorListeners = new Array();
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
    opResult = window.mqttApi.addMessageTopicListener(this.identifier, () => {
      this.messageListeners.forEach(listener => listener());
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
  sendMessage(topic, message) {
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
}

let riverMonitor = null;

const riverMonitorClientConsts = {
  topic: "esiot-2023"
}

let riverMonitorConnectionPod = null;
let waterLevelHistory = new Array();
let wlm = new WaterLevelMonitor();

function initRiverMonitorComms() {
  wlm = new WaterLevelMonitor("mqtt://broker.mqtt-dashboard.com:1883");
  wlm.init();
  wlm.connect();
  wlm.sendMessage("esiot-2023", "Ora sì che funziona!");
}

function initRiverMonitorClient() {
  let riverMonitorPodText = document.createElement("p");
  riverMonitorPodText.innerHTML = "Water level monitor is not currently connected";
  let riverMonitorPodStartConnBtn = document.createElement("button");
  riverMonitorPodStartConnBtn.innerHTML = "Connect"
  riverMonitorPodStartConnBtn.style.width = "100%";
  riverMonitorPodStartConnBtn.onclick = () => initRiverMonitorComms();
  let riverMonitorPodContent = document.createElement("div");
  riverMonitorPodContent.appendChild(riverMonitorPodText);
  riverMonitorPodContent.appendChild(riverMonitorPodStartConnBtn);
  riverMonitorConnectionPod = new podUi.Pillbox("Water Level Monitor interface", riverMonitorPodContent);
  globalValues.pillboxManager.attachPillbox(riverMonitorConnectionPod);
}
