const Author = {
  WATER_CHANNEL_CONTROLLER: 0b0,
  RIVER_MONITORING_SERVICE: 0b1
}
const DataTypes = {
  VALVE_FLOW: 0b0
}
const ControlTypes = {
  PING: 0b0,
  PONG: 0b1
}
const MessageTypes = {
  CONTROL: 0b0,
  DATA: 0b1
}

const Masks = {
  MASK_AUTHOR: 0b00000100,
  MASK_TYPE: 0b00000010,
  MASK_LAST: 0b00000001
}

class Message {
  constructor(messageType, contentType, content) {
    this.messageType = messageType;
    this.contentType = contentType;
    this.content = content;
  }
}

/**
 * 
 * @param {number[]} message 
 * @returns 
 */
function parseMessage(message) {
  if (message.length != 2) {
    throw new Error("Invalid message has been recieved");
  }
  let header = message[0];
  if ((header & Masks.MASK_AUTHOR) != 0) {
    return false;
  }
  let messageType = null;
  let contentType = null;
  let content = null;
  if ((header & Masks.MASK_TYPE) == 0) {
    messageType = MessageTypes.CONTROL;
    if ((header & Masks.MASK_LAST) != 0) {
      contentType = ControlTypes.PONG;
    }
  } else {
    messageType = MessageTypes.DATA;
    if ((header & Masks.MASK_LAST) == 0) {
      contentType = DataTypes.VALVE_FLOW;
      content = message[1];
    }
  }
  return new Message(messageType, contentType, content);
}

function isPong(message) {
  let messageMap = parseMessage(message);
  if (messageMap != false) {
    return messageMap.size == 1 && messageMap.has(ControlTypes.PONG);
  }
  return false;
}

const MessageParser = {
  parseMessage: (message) => parseMessage(message),
  isPong: (message) => isPong(message)
}
const MessageFactory = {
  generatePing: () => [(((Author.RIVER_MONITORING_SERVICE << 1) | MessageTypes.CONTROL) << 1) | ControlTypes.PING, 0b0],
  generateValveCommand: (flow) => [(((Author.RIVER_MONITORING_SERVICE << 1) | MessageTypes.DATA) << 1) | DataTypes.VALVE_FLOW, flow]
}

module.exports = { Author, DataTypes, ControlTypes, MessageTypes, MessageParser, MessageFactory }
