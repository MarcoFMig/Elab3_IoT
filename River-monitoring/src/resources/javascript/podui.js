const podUi = {
  Pillbox: class Pillbox {
    constructor(title, content = null) {
      this.pillbox = document.createElement("div");
      this.pillbox.classList.add("ui-pillbox");
      this.pillboxTitle = document.createElement("h1");
      this.pillboxTitle.innerHTML = title;
      this.pillbox.appendChild(this.pillboxTitle);
      if (content instanceof HTMLElement) {
        this.pillboxContent = content;
        this.pillbox.appendChild(content);
      } else {
        throw new Error("Unrecognized content type");
      }
    }
    getElement() {
      return this.pillbox;
    }
    getContent() {
      return this.pillboxContent;
    }
  }
}

const podManagers = {
  PillboxUIManager: class PillboxUIManager {
    /**
     * 
     * @param {HTMLElement} parentElement 
     */
    constructor(parentElement) {
      this.pillboxUiManagerElem = document.createElement("div");
      this.pillboxUiManagerElem.id = "ui-pillbox-container";
      parentElement.appendChild(this.pillboxUiManagerElem);
    }
    /**
     * 
     * @param {podUi.Pillbox} pillbox 
     */
    attachPillbox(pillbox) {
      if (pillbox instanceof podUi.Pillbox) {
        this.pillboxUiManagerElem.appendChild(pillbox.getElement());
      } else {
        throw new Error("Element passed is not a pillbox");
      }
    }
    /**
     * 
     * @param {podUi.Pillbox} pillbox 
     */
    detachPillbox(pillbox) {
      this.pillboxUiManagerElem.removeChild(pillbox.getElement());
    }
  },
  PopupManager: class PopupManager {
    constructor() {}
    generatePopup(title, text) {

    }
  }
}
