var path = require("path"),
  extend = require("extend"),
  http = require("http"),
  io = require('socket.io'),
  events = require('events'),
  util = require("util"),
  UglifyJS = require("uglify-js"),
  debug = require("debug")("myelements:server"),
  ElementsEventHandler = require("./elements-event-handler"),
  sharedSession = require("express-socket.io-session"),
  clientVersion = require('../package').version;


var config = {
  // socket instance
  sockets: null,
  // Default socket.io namespaced used by myelements
  socketNamespace: "/myelements",
  socketPath: "/socket.io",
  // Use no session middleware by default.
  session: undefined
};

module.exports = Server;
/**
 * Attachs a myelements handler to an express app (for emiting events on client
 * connection) and an http/https server for receiving client side events.
 * @param {express.App} app. An express request handler (express app)
 * @param {http.Server} httpServer. An http/https server to attach socket.io
 * @param {Object} options. 
 *   - {String} socketNamespace: . Default `/myelements`
 *   - {Function} session: an express session middleware as the one returned 
       by require("express-session")({...});
 */
function Server(app, httpServer, options) {
  if (!(this instanceof Server)) {
    return new Server(app, httpServer, options);
  }
  events.EventEmitter.call(this);

  config = extend({}, config, options);
  this.attach = attach;
  this.serveClient = serveClientOnExpressRoute;
  this.io = this.attach(app, httpServer);
}

// Inherit from EventEmitter
util.inherits(Server, events.EventEmitter);
/**
 * @param {express.App}
 * @param {http.Server}
 */
function attach(app, httpServer) {
  var _this = this;
  //Attach routes for browser client library
  if (app.use === undefined) {
    throw new Error("Unknown express() object passed to myelements. Please pass an " +
      "an express app (request handler function)");
  }
  if (!(httpServer instanceof http.Server)) {
    throw new Error("Unknown server object passed to myelements. Please pass an " +
      "http.Server as second parameters");
  }
  serveClientOnExpressRoute(app);
  return attachToHttpServer(httpServer, function onClientConnection(err, elementsEventHandler) {
    app.emit("myelements:connection", elementsEventHandler);
    _this.emit("connection", elementsEventHandler);
  });
}

/**
 * Listen for socket.io events on httpServer.
 *
 * @param {http.Server} httpServer. The server to attach socket.io to.
 * @param {Function} onConnectionCallback. Called when a socket client connects.
 *   - @param {Error} err. Null if nothing bad happened.
 *   - @param {EventEmitter} client. Event client.
 */
function attachToHttpServer(httpServer, onConnectionCallback) {
  // socket.io 
  var socketIoOptions = extend({}, {
    path: config.socketPath
  });
  var sockets = io.listen(httpServer, socketIoOptions);
  debug("Attaching to http.Server");
  return attachToSocketIo(sockets, onConnectionCallback);

}

/**
 * @param {io.Server} sockets
 */
function attachToSocketIo(sockets, onConnectionCallback) {
  // Communicate with client via myelements namespace
  var namespacedSockets = sockets.of(config.socketNamespace);

  // User express-session function passed as options
  // to myelements
  if (config.session) {
    debug("Using express session ass middleware for socket.io");
    namespacedSockets.use(sharedSession(config.session));
  }
  debug("Listening for socket.io client connections on namespace %s",
    config.socketNamespace);
  namespacedSockets.on('connection', function onSocketConnection(clientSocket) {
    onClientConnection(clientSocket, onConnectionCallback);
  });
  return namespacedSockets;
}
/**
 * Handles a new myelements client connection.
 *
 * @param {socket}. client socket for the new connection
 * @param {Function} onConnectionCallback. called after socket.io connection event
 *   - @param {Error} err. Null if nothing bad happened.
 *   - @param {ElementsEventHandler} elementsEventHandler. An instance
 *     of myelements client's event handler.
 */
function onClientConnection(clientSocket, onConnectionCallback) {

  var elementsEventHandler = new ElementsEventHandler(clientSocket);
  elementsEventHandler.session = clientSocket.handshake.session;
  debug("client connection");
  clientSocket.trigger = trigger.bind(clientSocket);
  //clientSocket.broadcast.trigger = broadcast.bind(clientSocket);
  clientSocket.on.message = onmessage.bind(clientSocket);
  onConnectionCallback(null, elementsEventHandler);
  elementsEventHandler.on("disconnect", function deleteElementsEventHandler() {
    elementsEventHandler = undefined;
  });
}

Server.client = function() {
  var join = path.join,
    sources = [
      require.resolve('socket.io-client/socket.io.js'),
      join(__dirname, "client", "lib/ejs/ejs_0.9_alpha_1_production.js"),
      join(__dirname, "client", "lib/page.js/page.js"),
      join(__dirname, "client", "lib/localforage/localforage.js"),
      join(__dirname, "client", "lib/debug/debug.js"),
      join(__dirname, "client", "lib/jquery.ui.widget/jquery.ui.widget.js"),
      join(__dirname, "client", "myelements.jquery.js")
    ];
  var result = UglifyJS.minify(sources, {
    mangle: false,
    compress: false
  });
  return result.code;
};
/**
 * Defines the route /events/client.js and serves up the browser javascript code
 *
 * The client depends on jQuery and socket.io client being already loaded
 * @param {express.App} app. An express request handler.
 */
function serveClientOnExpressRoute(app) {


  app.get("/myelements/myelements.jquery.js", function(req, res) {
    //logic taken form socket.io's serveClient
    // var etag = req.headers['if-none-match'];
    // if (etag) {
    //   if (clientVersion == etag) {
    //     debug('serve client 304');
    //     res.writeHead(304);
    //     res.end();
    //     return;
    //   }
    // }
    // debug('serve client source');
    // res.setHeader('ETag', clientVersion);
    res.setHeader("Content-type", "application/javascript");
    var result = Server.client();

    res.send(result);
    //res.sendFile(path.join(__dirname, "client.js"));
  });
}


/**
 * Triggers a message event that gets sent to the client
 *
 * @param {String} Message event to send to the client
 * @param {Object} data to send to with the message
 */
function trigger(event, data) {
  // Warn if someone tries to trigger a message but the client socket
  // has already disconnected
  if (this.disconnected) {
    debug("Trying to trigger client socket but client is disconnected");
    return;
  }

  // If the broadcast flag is set, call to this.broadcast.send
  if (this.flags && this.flags.broadcast) {
    debug("Broadcasting %s to frontend clients, with data: %j.", event, data);
    this.broadcast.send({
      "event": event,
      "data": data
    });
  } else {
    debug("Triggering: %s on frontend with data: %j.", event, data);
    this.send({
      "event": event,
      "data": data
    });
  }
}

function onmessage(expectedMessage, callback) {
  this.on("message", function(message) {
    if (message.event === expectedMessage) {
      callback(message.data);
    }
  });
}