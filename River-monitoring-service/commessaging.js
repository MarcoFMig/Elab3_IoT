const DEFAULT_SEPARATOR = "-";
const DEFAULT_ASSIGNER = ":";
const Author = {
  WATER_CHANNEL_CONTROLLER: 0b0,
  RIVER_MONITORING_SERVICE: 0b1
}
const DataTypes = {
  WATER_LEVEL_INFO: "wli"
}
const ControlTypes = {
  PING: "PING",
  PONG: "PONG"
}
const MessageTypes = {
  CONTROL: 0b0,
  DATA: 0b1
}
const DEFAULT_MESSAGE_TYPE_LENGTH = 4;

class RiverMonitorData {
  constructor(author, data) {
    this.author = author;
    this.data = data;
  }
}

class MQTTMessageFactory {
  constructor(separator = DEFAULT_SEPARATOR) {
    this.separator = DEFAULT_SEPARATOR;
  }
  addPrefix(message) {
    return Author.RIVER_MONITORING_SERVICE + this.separator + message;
  }
  generateSpacing(...data) {
    let monolith = "";
    data.forEach(singleData => {
      monolith += singleData + this.separator;
    });
    return monolith.slice(0, monolith.length - 1);
  }
  makeData(...dataToSend) {
    return this.addPrefix(MessageTypes.DATA + DEFAULT_SEPARATOR + this.generateSpacing(dataToSend));
  }
  makePing() {
    return this.addPrefix(MessageTypes.CONTROL + DEFAULT_SEPARATOR + ControlTypes.PING);
  }
}

/**
 * 
 * @param {string} message 
 */
function levelZeroParser(message) {
  if (message.startsWith(Author.WATER_LEVEL_MONITOR)) {
    return message.slice(Author.WATER_LEVEL_MONITOR.length + 1);
  } else {
    return false;
  }
}
/**
 * 
 * @param {string} message 
 */
function levelOneParser(message) {
  let messageType = retrieveMessageType(message);
    // NOTE: the length is intentionally not decreased in order to consider the spacer
  let trimmedMessage = message.slice(DEFAULT_MESSAGE_TYPE_LENGTH + 1);
  return trimmedMessage;
}
/**
 * 
 * @param {string} message 
 */
function retrieveMessageType(message) {
  // NOTE: the length is intentionally not decreased in order to consider the spacer
  switch (message.slice(0, DEFAULT_MESSAGE_TYPE_LENGTH)) {
    case MessageTypes.CONTROL:
      return MessageTypes.CONTROL;
    case MessageTypes.DATA:
      return MessageTypes.DATA;
    default:
      return false;
  }
}
/**
 * 
 * @param {string} levelZeroMessage 
 * @returns 
 */
function parseMessage(levelZeroMessage) {
  let levelOneMessage = levelZeroParser(levelZeroMessage);
  if (levelOneMessage == false) {
    return false;
  }
  let levelTwoMessage = levelOneParser(levelOneMessage);
  if (levelTwoMessage == false) {
    return false;
  }
  let dataMap = new Map();
  let dataElements = levelTwoMessage.split(DEFAULT_SEPARATOR);
  dataElements.forEach(value => {
    let separatedValue = value.split(DEFAULT_ASSIGNER);
    dataMap.set(separatedValue[0], separatedValue[1] == null ? null : separatedValue[1]);
  });
  return dataMap;
}

function isPong(message) {
  let messageMap = parseMessage(message);
  if (messageMap != false) {
    return messageMap.size == 1 && messageMap.has(ControlTypes.PONG);
  }
  return false;
}

const MessageParser = {
  /**
   * 
   * @param {string} message 
   */
  levelZeroParser: (message) => levelZeroParser(message),
  levelOneParser: (message) => levelOneParser(message),
  retrieveMessageType: (message) => retrieveMessageType(message),
  parseMessage: (message) => parseMessage(message),
  isPong: (message) => isPong(message)
}

module.exports = { RiverMonitorData, MQTTMessageFactory, Author, DataTypes, ControlTypes, MessageTypes, DEFAULT_SEPARATOR, MessageParser }

