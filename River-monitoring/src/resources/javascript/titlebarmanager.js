/**
 * A class to handle the spotlight of the title bar.
 */
class Stoplight {
  /**
   * Constructs a stoplight class.
   * @param {HTMLElement} minimizeBtn   minimize window button.
   * @param {HTMLElement} resizeBtn     resize window button.
   * @param {HTMLElement} exitBtn       exit program button.
   */
  constructor(minimizeBtn, resizeBtn, exitBtn) {
    this.minimizeListeners = new Array();
    this.resizeListeners = new Array();
    this.closeListeners = new Array();
    this.minimizeBtn = minimizeBtn;
    this.resizeBtn = resizeBtn;
    this.exitBtn = exitBtn;

    minimizeBtn.onclick = () => {
      this.minimizeListeners.forEach(listener => listener());
      mainIC.windowCtrl.sendHide();
    };
    resizeBtn.onclick = () => {
      this.resizeListeners.forEach(listener => listener());
      mainIC.windowCtrl.sendMaximize();
    };
    exitBtn.onclick = () => {
      this.closeListeners.forEach(listener => listener());
      mainIC.windowCtrl.sendClose();
    };
  }

  onMinimize(listener) {
    this.minimizeListeners.push(listener);
  }
  onResize(listener) {
    this.resizeListeners.push(listener);
  }
  onClose(listener) {
    this.closeListeners.push(listener);
  }
}

const titleBarManager = {
  init: () => {

  },
  window: {
    stoplight: new Stoplight(
      document.getElementById("btn-minimize"),
      document.getElementById("btn-enlarge"),
      document.getElementById("btn-quit"))
  }
}
