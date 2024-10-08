const DEFAULT_UPDATE_INTERVAL_MS = 2500;
const DEFAULT_TIME_LIMIT_MINUTES = 1;

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

function getRiverMonitorServerAddress() {
  return new URL(riverMonitorServerAddress.toString());
}

async function processIncomingData(data) {
  if (data.devices.water_channel_controller.softManualOverride == true) {
    manualOverrideLabelRef.innerHTML = "Soft manual Override: Enabled";
  } else {
    manualOverrideLabelRef.innerHTML = "Soft manual Override: Disabled";
  }
  waterLevelTrend = data.devices.water_level_monitor.waterLevelTrend;
  let valveOpening = data.devices.water_channel_controller.percievedValveOpening;
  let currentState = data.systemStatus;
  let currentValveOpening = data.devices.water_channel_controller.intendedValveOpening;
  //updateValveStatus(currentValveOpening);
  updateReadings(waterLevelTrend);
  updateState(valveOpening, currentState);
  //console.log(waterLevelTrend);
}

let wlmBoard = null;
let wlmBoardChart = null;
let dataCaptures = null;
let dataTimestamps = null;
function updateReadings(waterLevelMonitorTrend) {
  let iterVector = waterLevelMonitorTrend.length > 200
    ? waterLevelMonitorTrend.slice(-200)
    : waterLevelMonitorTrend;
  /*iterVector.forEach(capture => {
    let tmpDate = new Date(capture.timestamp);
    
    wlmBoardChart.data.labels.push(tmpDate.getHours() + ":" + tmpDate.getMinutes() + ":" + tmpDate.getSeconds());
    wlmBoardChart.data.datasets[0].data.push(capture.data);
    wlmBoardChart.update();
  });*/
  let dateLabels = iterVector.map(capture => new Date(capture.timestamp));
  dateLabels = dateLabels.map(capture =>
    capture.getHours().toString() + ":" +
    capture.getMinutes().toString() + ":" +
    capture.getSeconds().toString());
  let dateValues = iterVector.map(capture => capture.data);
  wlmBoardChart.data.labels = dateLabels;
  wlmBoardChart.data.datasets[0].data = dateValues;
  wlmBoardChart.update();
}
function showWLMBoard(show) {
  if (show) {
    let chartCanvas = document.createElement('canvas');
    chartCanvas.id = "water-level-monitor-dashboard-trend";
    wlmBoardChart = new Chart(chartCanvas, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Water Level Trend',
          data: [],
          borderWidth: 1
        }]
      },
      options: {
        scales: {
            x: {
                type: 'category'
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Value'
                }
            }
        }
    }
    });
    let wlmPodContentContainer = document.createElement('div');
    wlmPodContentContainer.appendChild(chartCanvas);
    wlmBoard = new podUi.Pillbox("Water Level Trend", wlmPodContentContainer);
    wlmBoard.getElement().id = "water-level-trend-pod";
    globalValues.pillboxManager.attachPillbox(wlmBoard);
  }
}

function updateFrequency(f1Btn, f2Btn, value) {

}

let frequencyManipulatorBoard = null;
let captureFrequencyVisualizer = null;
function showFrequencyManipulator(show) {
  if (show) {
    let f1FreqBtn = document.createElement('button');
    f1FreqBtn.innerHTML = "10 Captures";
    f1FreqBtn.name = 'frequency-one-selector-btn';
    f1FreqBtn.id = 'frequency-one-selector-btn';
    f1FreqBtn.value = 60;
    let f2FreqBtn = document.createElement('button');
    f2FreqBtn.name = 'frequency-two-selector-btn';
    f2FreqBtn.id = 'frequency-two-selector-btn';
    f2FreqBtn.innerHTML = "100 Captures";
    f2FreqBtn.value = 6;
    f1FreqBtn.onclick = () => {
      updateFrequency(f1FreqBtn, f2FreqBtn, f1FreqBtn.value);
      captureFrequencyVisualizer.innerHTML = "Current capture frequency: 10 c/m"
    }
    f2FreqBtn.onclick = () => {
      updateFrequency(f1FreqBtn, f2FreqBtn, f2FreqBtn.value);
      captureFrequencyVisualizer.innerHTML = "Current capture frequency: 100 c/m"
    }
    captureFrequencyVisualizer = document.createElement('p');
    captureFrequencyVisualizer.innerHTML = "Current capture frequency: 10 c/m"
    let frequencyManipulatorPodContentContainer = document.createElement('div');
    frequencyManipulatorPodContentContainer.appendChild(captureFrequencyVisualizer);
    frequencyManipulatorPodContentContainer.appendChild(f1FreqBtn);
    frequencyManipulatorPodContentContainer.appendChild(f2FreqBtn);
    frequencyManipulatorBoard = new podUi.Pillbox("Change capture frequency", frequencyManipulatorPodContentContainer);
    frequencyManipulatorBoard.getElement().id = "frequency-manipulator-pod";
    globalValues.pillboxManager.attachPillbox(frequencyManipulatorBoard);
  }
}

let currentStateBoard = null;
let manualOverrideLabelRef = null;

function updateState(valveOpening, currentState) {
  let stateUpdate = document.getElementById("current-state-text");
  let valveUpdate = document.getElementById("current-valve-text");

  if ((stateUpdate != undefined && stateUpdate != null)
      || (valveUpdate != undefined && valveUpdate != null)) {
    stateUpdate.innerHTML = "Current state: " + currentState;
    valveUpdate.innerHTML = "Valve opening: " + valveOpening;
  }
}


function showCurrentState(show) {
  if (show) {
    let stateParagraph = document.createElement("p");
    stateParagraph.id = "current-state-text";
    stateParagraph.innerHTML = "Current state: ";
    let valveParagraph = document.createElement("p");
    valveParagraph.id = "current-valve-text";
    valveParagraph.innerHTML = "Valve opening: ";
    let manualOverrideLabel = document.createElement("p");
    manualOverrideLabel.innerHTML = "Soft manual Override:";
    manualOverrideLabelRef = manualOverrideLabel;
    valveParagraph.id = "current-valve-text";
    valveParagraph.innerHTML = "Valve opening: ";
    let currentStaterPodContentContainer = document.createElement('div');
    currentStaterPodContentContainer.appendChild(manualOverrideLabel);
    currentStaterPodContentContainer.appendChild(stateParagraph);
    currentStaterPodContentContainer.appendChild(valveParagraph);
    currentStateBoard = new podUi.Pillbox("Current state update", currentStaterPodContentContainer);
    currentStateBoard.getElement().id = "current-state-update";
    globalValues.pillboxManager.attachPillbox(currentStateBoard);
  }
}

let manualValueSliderRef = null;

function updateValveStatus(valveOpeningLevel) {
  manualValueSliderRef.value = valveOpeningLevel;
  //console.log("Setting opening level to: " + valveOpeningLevel);
}

async function toggleManual(manual) {
  let serverAddress = getRiverMonitorServerAddress();
  serverAddress.searchParams.set("operation", "setManual");
  serverAddress.searchParams.set("value", manual);
  let request = await fetch(serverAddress, {
    method: "POST"
  });
}

async function sendManualCommand(degrees) {
  toggleManual(true);
  serverAddress = getRiverMonitorServerAddress();
  serverAddress.searchParams.set("operation", "valveOpening");
  serverAddress.searchParams.set("value", degrees);
  request = await fetch(serverAddress, {
    method: "POST"
  });
}

function showManualValue(show) {
  if (show) {
    let disableManualValue = document.createElement("button");
    disableManualValue.innerHTML = "Enable automatic";
    disableManualValue.onclick = () => toggleManual(false);
    let manualValueSlider = document.createElement("input");
    manualValueSlider.type = "range";
    manualValueSlider.min = 0;
    manualValueSlider.max = 100;
    manualValueSliderRef = manualValueSlider;
    let manualValueSliderConfirmBtn = document.createElement("button");
    manualValueSliderConfirmBtn.innerHTML = "Confirm";
    manualValueSliderConfirmBtn.onclick = () => sendManualCommand(manualValueSlider.value);
    let manualValueLabel = document.createElement("label");
    manualValueLabel.innerHTML = "Manual Value Slider"
    let manualValuePodContentContainer = document.createElement('div');
    manualValuePodContentContainer.id = "manual-value-content-container";
    manualValuePodContentContainer.appendChild(manualValueLabel);
    manualValuePodContentContainer.appendChild(manualValueSlider);
    manualValuePodContentContainer.appendChild(manualValueSliderConfirmBtn);
    manualValuePodContentContainer.appendChild(disableManualValue);
    let manualValueBoard = new podUi.Pillbox("Manual Value Slider", manualValuePodContentContainer);
    manualValueBoard.getElement().id = "manual-value-slider";
    globalValues.pillboxManager.attachPillbox(manualValueBoard);
  }
}

let requestBusy = false;
let trafficBusy = false;
let connectionActive = false;
async function postConnectionInit() {
  showWLMBoard(true);
  //showFrequencyManipulator(true);
  showCurrentState(true);
  showManualValue(true);
  setInterval(async () => {
    if (!requestBusy) {
      let serverAddress = getRiverMonitorServerAddress();
      serverAddress.searchParams.set("timeWindowMinutes", DEFAULT_TIME_LIMIT_MINUTES);
      requestBusy = true;
      setTrafficOn(true);
      let request = await fetch(serverAddress);
      if (request.status != 200) {
        // TODO: Something here
      }
      let content = JSON.parse(await request.text());
      processIncomingData(content);
      updateReadings(waterLevelTrend);
      setTrafficOn(false);
      requestBusy = false;
    } else {
      return;
    }
  }, DEFAULT_UPDATE_INTERVAL_MS);
}

function setWarningToConnectionBox(warningMessage) {
  let element = document.getElementById("ip-insertion-warning");
  if (warningMessage == "") {
    element.innerHTML = "";
    element.style.visibility = "hidden";
  }
  element.innerHTML = warningMessage;
  element.style.visibility = "visible";
}

async function initRiverMonitorComms(addressBox, connectionPod) {
  if (addressBox.value == "") {
    return;
  }
  let address = new URL(`http://${addressBox.value}:8123`);
  address.searchParams.append("operationType", "connectionCheck");
  try {
    let result = await fetch(address);
    let inboundText = JSON.parse(await result.text());
    if (result.status != 200) {
      // TODO: SOMETHING HERE
    }
    if (inboundText.code == 200) {
      globalValues.pillboxManager.detachPillbox(connectionPod);
      setConnectionActive(true);
      riverMonitorServerAddress = new URL(`http://${addressBox.value}:8123`);
      await postConnectionInit();
    }
  } catch (error) {
    if (error.message == "Failed to fetch") {
      setWarningToConnectionBox("Invalid server address");
    }
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
  let riverMonitorAddressWarning = document.createElement("p");
  riverMonitorAddressWarning.innerHTML = "";
  riverMonitorAddressWarning.id = "ip-insertion-warning";
  let riverMonitorPodStartConnBtn = document.createElement('button');
  riverMonitorPodStartConnBtn.innerHTML = "Connect"
  riverMonitorPodStartConnBtn.style.width = "100%";
  riverMonitorPodStartConnBtn.onclick = () => initRiverMonitorComms(riverMonitorAddressInsertion, riverMonitorConnectionPod);
  let riverMonitorPodContent = document.createElement("div");
  riverMonitorPodContent.appendChild(riverMonitorPodText);
  riverMonitorPodContent.appendChild(riverMonitorAddressInsertion);
  riverMonitorPodContent.appendChild(riverMonitorAddressWarning);
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

function initRiverMonitorClient() {
  gatherRequiredElements();
  generateControlPod();
}
