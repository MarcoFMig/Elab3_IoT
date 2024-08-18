const { contextBridge } = require('electron')
const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

let comSessions = []

/**
 * Checks if a string starts with any of the strings passed.
 * @param {*} str the string to check
 * @param {*} substrs a set of starting points
 * @returns returns true if any of the substrings are
 * 			present at the start of the given string
 */
function stringStartsWith(string, stringSet) {
	return stringSet.some(substr => string.startsWith(substr));
}

const comManager = {
	listConnectedDevices: () => {
		return SerialPort.list()
	},
	generateComSession: (path, baudrate, openFunc, dataFunc) => {
		let ses = new COMSession(path, baudrate, openFunc, dataFunc)
		comSessions.push(ses)
		return comSessions.indexOf(ses)
	},
	startComSession: (sessionId) => {
		comSessions[sessionId].startConnection()
	},
	sendMessageToComSession: (sessionId, data, errorHandler) => {
		comSessions[sessionId].sendMessage(data, errorHandler)
	}
}

class COMSession {
	constructor(path, baudrate, openFunc, dataFunc) {
		this.path = path
		this.baudrate = baudrate
		this.openFunc = openFunc
		this.dataFunc = dataFunc
	}

	startConnection() {
		this.serialConnPort = new SerialPort({
			path:this.path,
			baudRate:this.baudrate
		})
		const dataParser = this.serialConnPort.pipe(
			new ReadlineParser({ delimiter: '\n' }))
			this.serialConnPort.on("open", () => {
			this.openFunc()
		});
		dataParser.on('data', (data) =>{
			this.dataFunc(data)
		});
	}
	
	sendMessage(data, errorHandler) {
		this.serialConnPort.write(data, function(error) {
			if (error) {
			  return console.log('Error on write: ', err.message)
			}
		  })
	}
}

contextBridge.exposeInMainWorld("internalApis", {
	comManager: comManager
})
