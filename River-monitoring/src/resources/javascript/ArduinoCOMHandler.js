let listPanel
let busyPorts = []
let deviceListCache = []
let connectedArduinos = []
let arduinoHandlerPod = null;

class Arduino {
    constructor(path, baudrate) {
        this.path = path
        this.baudrate = baudrate
        this.openConnection()
    }

    openConnection() {
        //console.log("Firing connection on port "+this.path+" with baudrate at: "+this.baudrate)
        this.sessionId = window.internalApis.comManager.generateComSession(this.path, this.baudrate, () => {
            console.log("Connection open")
        },
        (data) => {
            this.levelZeroParser(data)
        })
        this.setStatus(arduinoCOMsConstants.arduinoStatuses.good)
        window.internalApis.comManager.startComSession(this.sessionId)
    }

    sendMessage(data, errorHandler) {
        window.internalApis.comManager.sendMessageToComSession(this.sessionId, data, errorHandler);
    }

    updateDeviceList() {
        deviceListCache = window.internalApis.comManager.listConnectedDevices()
    }

    setStatus(status) {
        switch(status) {
            case arduinoCOMsConstants.arduinoStatuses.none:
                this.status.style = "color: gray"
                this.status.innerText = "Status: "+status
            break;
            case arduinoCOMsConstants.arduinoStatuses.erro:
                this.status.style = "color: red"
                this.status.innerText = "Manteinance required"
                this.monitorCapsule.getBody().appendChild(this.fireManteinance)
            break;
            case arduinoCOMsConstants.arduinoStatuses.good:
                this.status.style = "color: green"
                this.status.innerText = "Status: "+status
            break;
            case arduinoCOMsConstants.arduinoStatuses.warn:
                this.status.style = "color: yellow"
                this.status.innerText = "Status: "+status
            break;
        }
    }
    
    dataHandler(splicedData) {
        switch(splicedData[0]) {
            case arduinoCOMsConstants.messageSyntax.TMP_SENSOR:
                this.setTemperature(splicedData[1])
            break;
            case arduinoCOMsConstants.messageSyntax.WASH:
                this.setWashes(splicedData[1])
            break;
            default:
                sendParserWarning("Recieved unknown data type from arduino on "
                    + this.path
                    + "\nDumping unencapsulated data:\n"
                    + splicedData)
            break;
        }
    }
    
    faultHandler(splicedData) {
        this.setStatus(arduinoCOMsConstants.arduinoStatuses.erro)
    }
    
    levelOneParser(splicedData) {
        switch(splicedData[0]) {
            case "DATA":
                this.dataHandler(splicedData.splice(1, splicedData.length))
            break;
            case "FAULT":
                this.faultHandler(splicedData.splice(1, splicedData.length))
            break;
            default:
                sendParserWarning("Unrecognized directive, check for language updates"
                    + "\nDumping unknown packet:"
                    + splicedData)
            break;
        }
    }

    levelZeroParser(data) {
        let separatedDataPacket = data.split("-")
        if (separatedDataPacket[0] == "CW" && separatedDataPacket[1] == "MC") {
            this.levelOneParser(separatedDataPacket.splice(2, separatedDataPacket.length))
        } else {
            sendParserWarning()
        }
    }

    getPath() {
        return this.path
    }
}

function sendParserWarning(message) {
    if (message  !== 'undefined') {
        console.warn("[PARSER] "+ message)
    }
}

const arduinoCOMsConstants = {
    deviceScanInterval: 1000,
    deviceEntryElementPrefix: '__COME_',
    defaultBaudRate: 9600,
    arduinoStatuses: {
        good: "GOOD",
        warn: "WARNING",
        erro: "ERROR",
        none: "NONE"
    },
    defaultTempCelsius: 20,
    resumeOperationMessage: "CW_PC_ACK",
    messageSyntax: {
        PREFIX: "CW",
        SPACING: "-",
        ENDLINE: "\n",
        MC_PREFIX: "MC",
        PC_PREFIX: "PC",
        HANDSHAKE: "INIT",
        CONFIRM: "ACK",
        END: "CLOSE",
        FAULT: "FAULT",
        DATA: "DATA",
        TMP_SENSOR: "TMP",
        WASH: "WASH"
    }
}

class MessageFactory {
    static #generateMesssageFrame(content) {
        return arduinoCOMsConstants.messageSyntax.PREFIX
            + arduinoCOMsConstants.messageSyntax.SPACING
            + arduinoCOMsConstants.messageSyntax.PC_PREFIX
            + arduinoCOMsConstants.messageSyntax.SPACING
            + content
            + arduinoCOMsConstants.messageSyntax.ENDLINE
    }
    static generateDataMessage(subject, data) {
        return this.#generateMesssageFrame(
            arduinoCOMsConstants.messageSyntax.DATA
            + arduinoCOMsConstants.messageSyntax.SPACING
            + subject
            + arduinoCOMsConstants.messageSyntax.SPACING
            + data)
    }
    static generateAcknowledgeMessage() {
        return this.#generateMesssageFrame(arduinoCOMsConstants.messageSyntax.CONFIRM)
    }
}

function initArduinoComms() {
    window.setInterval(fireDeviceScan, arduinoCOMsConstants.deviceScanInterval)
}

function registerListPanel(element) {
    listPanel = element
}

async function fireDeviceScan() {
    let promiseList = window.internalApis.comManager.listConnectedDevices()
	let deviceList = await promiseList
  	if (deviceList.length == 0) {
    	return
  	}
    deviceList.forEach((detectedDevice) => {
        if (detectedDevice.vendorId == "2341") {
            deviceListHandler(detectedDevice)
        }
    })
}

function deviceListHandler(detectedDevice) {
    let found = false
    let connected = false

    deviceListCache.forEach((singleDevice) => {
        if (singleDevice.path == detectedDevice.path) {
            found = true
        }
    })
    connectedArduinos.forEach((singleDevice) => {
        if (singleDevice.getPath() == detectedDevice.path) {
            connected = true
        }
    })

    if (!found && !connected) {
        deviceListCache.push(detectedDevice)
        buildDeviceList()
    }
}

function buildDeviceList() {
    console.log("updated")
    if (listPanel === 'undefined' || deviceListCache.length == 0) {
        return
    }

    deviceListCache.forEach(device => {
        let deviceEntryElement = document.createElement('div')
        deviceEntryElement.className = 'DeviceEntry'
        deviceEntryElement.id = arduinoCOMsConstants.deviceEntryElementPrefix
            + deviceListCache.indexOf(device)
        
        let deviceName = document.createElement("h3")
        deviceName.textContent = "Arduino"

        let deviceDetail = document.createElement("p")
        deviceDetail.innerText = "Port: " + device.path

        let deviceConnectBtn = document.createElement("button")
        deviceConnectBtn.type = "button"
        deviceConnectBtn.addEventListener("click", () => {
            let found = false
            connectedArduinos.forEach((arduinoEntry) => {
                if (arduinoEntry.getPath() == device.path) {
                    found = true;
                }
            })
            if (found) {
                return
            }
            let nard = new Arduino(connectedArduinos.length, device.path, arduinoCOMsConstants.defaultBaudRate, getCapsuleManager())
            nard.openConnection()
            connectedArduinos.push(nard)
        })
        deviceConnectBtn.textContent = "Connect"

        deviceEntryElement.appendChild(deviceName)
        deviceEntryElement.appendChild(deviceDetail)
        deviceEntryElement.appendChild(deviceConnectBtn)
        listPanel.appendChild(deviceEntryElement)
    })
}

function generateArduinoHandlerPod() {
    let arduinoHandlerPodText = document.createElement("p");
    arduinoHandlerPodText.innerHTML = "arduinoHandlerPodText foo";
    let arduinoHandlerPodContent = document.createElement("div");
    arduinoHandlerPodContent.appendChild(arduinoHandlerPodText);
    arduinoHandlerPod = new podUi.Pillbox("Arduino Handler interface", arduinoHandlerPodContent);
    globalValues.pillboxManager.attachPillbox(arduinoHandlerPod);
}  