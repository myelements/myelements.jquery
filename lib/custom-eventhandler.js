/**
 * Inspired by
 * http://spiritconsulting.com.ar/fedex/2010/11/events-with-jquery-nodejs-and-socket-io/
 */
var util = require("util"),
  events = require('events'),
  debug = require("debug")("myelements:CustomEventHandler");

module.exports = CustomEventHandler;

/**
 * Creates an event emitter and forwards every event to client
 */
function CustomEventHandler(client) {
  //Call EventEmmiter _contructor_
  var _this = this;
  events.EventEmitter.call(this);
  this.client = client;

  // On every message event received by socket we get
  // an message event object like {event:, data:} 
  // we emit  a local event through an EventEmitter interface
  // with .event as event type and .data as
  // event data;
  client.on('message', function(message, callback) {

    if (message.event != undefined) {
      debug("message received: %s", JSON.stringify(message));
      _this.emit(message.event, message.data);
      callback();
    }
  });
}
// Inherit from EventEmitter
util.inherits(CustomEventHandler, events.EventEmitter);


CustomEventHandler.prototype.trigger = function(event, data) {
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

CustomEventHandler.prototype._broadcast = function(event, data) {
  debug("Message triggered: %s: %s.",
    event, JSON.stringify(data));
  this.client.broadcast.send({
    "event": event,
    "data": data
  });
};