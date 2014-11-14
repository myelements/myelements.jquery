/**
 * Inspired by
 * http://spiritconsulting.com.ar/fedex/2010/11/events-with-jquery-nodejs-and-socket-io/
 */
var util = require("util"),
  events = require('events'),
  debug = require("debug")("myelements:ElementEventHandler");

module.exports = ElementEventHandler;

/**
 * Creates an event emitter and forwards every event triggeredto client
 * @param {io.Client} A socket.io client instance on which to send messages.
 */
function ElementEventHandler(client) {
  //Call EventEmmiter _contructor_
  var _this = this;
  events.EventEmitter.call(this);
  this.client = client;

  // On every message event received by socket we get
  // an message event object like {event:, data:} 
  // we emit  a local event through an EventEmitter interface
  // with .event as event type and .data as
  // event data;
  this.client.on('message', function(message, callback) {
    if (message.event != undefined) {
      debug("message received: %s", JSON.stringify(message));
      _this.emit(message.event, message.data);
      callback();
    }
  });
  this.client.on("disconnect", function() {
    delete(this.client);
    _this.emit("disconnect");
  });
}
// Inherit from EventEmitter
util.inherits(ElementEventHandler, events.EventEmitter);

/**
 * Triggers a message event that gets sent to the client
 *
 * @param {String} Message event to send to the client
 * @param {Object} data to send to with the message
 */
ElementEventHandler.prototype.trigger = function(event, data) {
  // Warn if someone tries to trigger a message but the client socket
  // has already disconnected
  if (this.client.disconnected) {
    debug("Trying to trigger client but client is disconnected");
    return
  }

  debug("Message triggered: %s: %s.",
    event, JSON.stringify(data));
  this.client.send({
    "event": event,
    "data": data
  });
};
/**
 * Triggers a broadcast message event that gets sent to every client connected
 * to this message server
 *
 * @param {String} Message event to send to the client
 * @param {Object} data to send to with the message
 */
ElementEventHandler.prototype._broadcast = function(event, data) {
  debug("Message triggered: %s: %s.",
    event, JSON.stringify(data));
  this.client.broadcast.send({
    "event": event,
    "data": data
  });
};