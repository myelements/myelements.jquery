/**
 * Inspired by
 * http://spiritconsulting.com.ar/fedex/2010/11/events-with-jquery-nodejs-and-socket-io/
 */
var util = require("util"),
  events = require('events'),
  debug = require("debug")("myelements:ElementsEventHandler");

module.exports = ElementsEventHandler;

/**
 * Creates an event emitter and forwards every event triggered to client
 * @param {io.Client} socket A socket.io client instance on which to send messages.
 */
function ElementsEventHandler(socket) {
  var _this = this;
  //Call EventEmmiter _contructor_
  events.EventEmitter.call(this);
  this.socket = socket;

  // On every message event received by socket we get
  // an message event object like {event:, data:} 
  // we emit  a local event through an EventEmitter interface
  // with .event as event type and .data as
  // event data;
  this.socket.on('message', function(message, callback) {
    debug("Forwarding frontend message '%s', with data %j", message.event, message.data);
    if (message.event !== undefined) {
      _this.emit(message.event, message.data);
      if (typeof callback === 'function') {
        callback();
      }
    }
    if (message.event === "userinput" && message.scope !== undefined) {
      debug("userinput received: %s", JSON.stringify(message));
      _this.emit(message.scope, message.data);
    }
  });
  this.socket.on("disconnect", function() {
    delete(this.socket);
    _this.emit("disconnect");
  });
}
// Inherit from EventEmitter
util.inherits(ElementsEventHandler, events.EventEmitter);

/**
 * Triggers a message event that gets sent to the client
 *
 * @param {String} Message event to send to the client
 * @param {Object} data to send to with the message
 */
ElementsEventHandler.prototype.trigger = function(event, data) {
  // Warn if someone tries to trigger a message but the client socket
  // has already disconnected
  if (this.socket.disconnected) {
    debug("Trying to trigger client socket but client is disconnected");
    return;
  }

  debug("Message triggered: %s: %s.",
    event, JSON.stringify(data));
  this.socket.send({
    "event": event,
    "data": data
  });
};
/**
 * Triggers a broadcast message event that gets sent to every client connected
 * to this message server
 *
 * @param {String} Message event to send to the client socket
 * @param {Object} data to send to with the message
 */
ElementsEventHandler.prototype._broadcast = function(event, data) {
  debug("Message triggered: %s: %s.",
    event, JSON.stringify(data));
  this.socket.broadcast.send({
    "event": event,
    "data": data
  });
};