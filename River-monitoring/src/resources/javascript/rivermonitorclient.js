class WaterLevelMonitor {
  constructor() {
    this.connected = false;
    this.identifier = null;
  }
  setConnection(identifier) {
    this.connectionId = identifier;
    this.connected = true;
  }
  reset() {
    this.connected = false;
    this.identifier = null;
  }
}

const riverMonitorClientConsts = {
  topic: "esiot-2023"
}

let riverMonitorConnectionPod = null;
let waterLevelHistory = new Array();
let wlm = new WaterLevelMonitor();

async function initRiverMonitorComms() {
  let connectionId =
    await window.mainCommunicator.invoke(
      window.systemInterface.mqttApi.consts.CREATE_CONNECTION,
      "mqtt://broker.mqtt-dashboard.com:1883");
  let opResult = 0;
  opResult = await window.mainCommunicator.invoke(
    window.systemInterface.mqttApi.consts.ADD_CONNECT_LISTENER,
    () => {
      console.log("connection succesfully enstabilished");
    }
  )
  /*
  opResult = await window.mainCommunicator.invoke(
    window.systemInterface.mqttApi.consts.ADD_RECONNECT_LISTENER,
    () => {
      console.log("reconnecting to water level monitor");
    }
  )
  opResult = await window.mainCommunicator.invoke(
    window.systemInterface.mqttApi.consts.ADD_ERROR_LISTENER,
    () => {
      console.log("error in water level monitor connection");
    }
  )
  opResult = await window.mainCommunicator.invoke(
    window.systemInterface.mqttApi.consts.ADD_DISCONNECT_LISTENER,
    () => {
      console.log("succesfully disconnected from water level monitor");
    }
  )
  opResult = await window.mainCommunicator.invoke(
    window.systemInterface.mqttApi.consts.ADD_MESSAGE_LISTENER,
    () => {
      console.log("recieved message from water level monitor");
    }
  )*/
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
