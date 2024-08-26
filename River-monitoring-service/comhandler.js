const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')

// SERIAL COM PART

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

class COMSession {
	constructor(path, baudrate, openFunc, dataFunc) {
		this.path = path
		this.baudrate = baudrate
		this.openFunc = openFunc
		this.dataFunc = dataFunc
	}

	startConnection() {
		this.serialConnPort = new SerialPort({
			path:this.path.path,
			baudRate:this.baudrate
		})

		const dataParser = this.serialConnPort.pipe(new ReadlineParser({delimiter: '\n'}));
		
    this.serialConnPort.on("open", () => {
      this.openFunc();
    });

		dataParser.on('data', (data) =>{
			this.dataFunc(data);
		});
	}
	
	sendMessage(data, errorHandler) {
		this.serialConnPort.write(data, function(error) {
			if (error) {
			  return console.log('Error on write: ', err.message);
			}
		})
	}
}

const serialComunicationManager = {
	listConnectedDevices: () => {
		return SerialPort.list()
	},

	generateComSession: (path, baudrate, openFunc, dataFunc) => {
		let sesssion = new COMSession(path, baudrate, openFunc, dataFunc)
		comSessions.push(sesssion)
		return comSessions.indexOf(sesssion)
	},

	startComSession: (sessionId) => {
		comSessions[sessionId].startConnection()
	},

	sendMessageToComSession: (sessionId, data, errorHandler = null) => {
		comSessions[sessionId].sendMessage(data, errorHandler)
	}
}

module.exports = { COMSession, serialComunicationManager }
