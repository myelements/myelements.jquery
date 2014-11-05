/**
 * Inspired by
 * http://spiritconsulting.com.ar/fedex/2010/11/events-with-jquery-nodejs-and-socket-io/
 */
var path = require("path"),
  http = require("http"),
  io = require('socket.io'),
  util = require('util'),
  UglifyJS = require("uglify-js"),
  debug = require("debug")("myelements:server"),
  CustomEventHandler = require("./custom-eventhandler");
clientVersion = require('../package').version;


var config = {
  socketNamespace: "/myelements"
};

module.exports = Server;

function Server(where, onConnectionCallback) {
  if (!(this instanceof Server)) {
    return new Server(where, onConnectionCallback);
  }
  this.attach = attach;
  this.serveClient = serveClientOnExpressRoute;
  if (where) {
    this.attach(where, onConnectionCallback);
  }
}

function attach(where, onConnectionCallback) {
  if (where instanceof http.Server) {
    debug("listening for jquery events on http.Server instance");
    attachToHttpServer(where, onConnectionCallback);
  } else if (where.use !== undefined) {
    // Detect an express app by its .use method
    debug("Listening for myelements events on express app");
    attachToExpressApp(where, onConnectionCallback);

  } else {
    throw new Error("Unknown object passed to myelements. Please pass an " +
      "http.Server or an express app (request handler function)");
  }
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
  var sockets = io.listen(httpServer);
  // Communicate with client via myelements namespace
  var myelement = sockets.of(config.socketNamespace);
  myelement.on('connection', function(clientSocket) {
    onClientConnection(clientSocket, onConnectionCallback)
  });
}

function attachToExpressApp(app, onConnectionCallback) {
  //Attach routes for browser client library
  serveClientOnExpressRoute(app);
  attachToHttpServer(app.httpServer, onConnectionCallback);
}

function onClientConnection(clientSocket, onConnectionCallback) {

  var customEventHandler = new CustomEventHandler(clientSocket);
  debug("myelements client connected");

  onConnectionCallback(null, customEventHandler);
}

/**
 * Defines the route /events/client.js and serves up the browser javascript code
 * The client depends on jQuery and socket.io client being already loaded
 * @param {Express}
 */
function serveClientOnExpressRoute(app) {
  var join = path.join;
  var sources = [
    join(__dirname, "client", "lib/ejs/ejs_0.9_alpha_1_production.js"),
    join(__dirname, "client", "lib/page.js/page.js"),
    join(__dirname, "client", "lib/localforage/localforage.js"),
    join(__dirname, "client", "lib/debug/debug.js"),
    join(__dirname, "client", "myelements.jquery.js")
  ];
  app.get("/myelements.jquery.js", function(req, res, next) {
    res.setHeader("Content-type", "application/javascript");
    var result = UglifyJS.minify(sources, {
      mangle: false,
      compress: false
    });
    res.send(result.code);
    //res.sendFile(path.join(__dirname, "client.js"));
  });
}