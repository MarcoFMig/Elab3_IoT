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
    this.maximized = false;

    minimizeBtn.onclick = () => {
      this.minimizeListeners.forEach(listener => listener());
      mainIC.windowCtrl.sendHide();
    };
    resizeBtn.onclick = () => {
      this.resizeListeners.forEach(listener => listener());
      if (this.maximized) {
        mainIC.windowCtrl.sendMinimize();
        this.resizeBtn.getElementsByTagName("img")[0].src = "./resources/images/vector/four-corners-arrows-line-icon-white.svg"
        this.maximized = false;
      } else {
        mainIC.windowCtrl.sendMaximize();
        this.resizeBtn.getElementsByTagName("img")[0].src = "./resources/images/vector/four-arrows-inside-line-icon-white.svg"
        this.maximized = true;
      }
    };
    exitBtn.onclick = () => {
      this.closeListeners.forEach(listener => listener());
      mainIC.windowCtrl.sendClose();
    };
  }

  /**
   * Registers a listener for when the window is minimized.
   * @param {function(*): void} listener  the listener that will be called
   */
  onMinimize(listener) {
    this.minimizeListeners.push(listener);
  }
  /**
   * Registers a listener for when the window is maximized / minimized.
   * @param {function(*): void} listener the listener that will be called
   */
  onResize(listener) {
    this.resizeListeners.push(listener);
  }
  /**
   * Register a listener for when the window is closed.
   * @param {function(*): void} listener the listener that will be called
   */
  onClose(listener) {
    this.closeListeners.push(listener);
  }
}

/**
 * Title bar manager namespace.
 */
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
