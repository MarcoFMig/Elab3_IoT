class Stoplight {
  constructor(minimizeBtn, resizeBtn, exitBtn) {
    this.minimizeListeners = new Array();
    this.resizeListeners = new Array();
    this.closeListeners = new Array();
    this.minimizeBtn = minimizeBtn;
    this.resizeBtn = resizeBtn;
    this.exitBtn = exitBtn;
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

const TitleBarManager = {
  init: () => {

  }
}
