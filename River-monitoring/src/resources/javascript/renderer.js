let globalValues = {
  pillboxManager: null
}

const mainIC = {
  windowCtrl: {
    sendClose: () => window.mainCommunicator.fire("wc-close"),
    sendMaximize: () => window.mainCommunicator.fire("wc-maximize"),
    sendMinimize: () => window.mainCommunicator.fire("wc-minimize"),
    sendIconify: () => window.mainCommunicator.fire("wc-iconify"),
    sendHide: () => window.mainCommunicator.fire("wc-hide")
  }
}

const renderer = {
  init: () => {
    globalValues.pillboxManager = new podManagers.PillboxUIManager(document.body);
    initRiverMonitorClient();
    //generateArduinoHandlerPod();
  }
}

window.onload = () => renderer.init();
