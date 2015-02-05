/*global $:false */
/*global page:false */
/*global localforage:false */
/*global debug:false */
/*global io:false */
/*global EJS:false */
/**
 * myelements.jquery.js
 * https://github.com/myelements/myelements.jquery
 *
 * Implemented as
 *   - Express middleware (server side)
 *   - jQuery plugin. (browser side);
 * myelements is an instance of io.Socket
 * io.Socket inherits from EventEmitter
 *
 * Internally:
 * - It interfaces with the UI (i.e local events) via jQuery with
 * $(myelements).trigger
 * - It interfaces with the server (i.e. backended events) via socket.io's .send()
 *
 * Options - provided by window.myelementsOptions
 *
 *   - {String} socketHost. Host or host:port for the backend.
 *   - {String} socketNamespace: socket.io namespace used by myelements
 *   - {String} socketPath. socket.io HTTP URL used by meyelements socket.io Manager instance
 */
var $myelements = (function() {
  var uri,
    // Default options + user provided options
    // via window.myElementsOptions
    options = $.extend({
      // Host or host:port for the backend 
      socketHost: undefined,
      // socket.io namespace used by myelements
      socketNamespace: "/myelements",
      // socket.io HTTP URL used by meyelements socket.io Manager instance
      socketPath: "/socket.io",
    }, window.myElementsOptions, window.myelementsOptions);


  if (options.socketHost) {
    uri = options.socketHost + options.socketNamespace
  } else {
    uri = options.socketNamespace
  }
  var socket = io(uri, {
    path: options.socketPath
  });
  var $socketOnSteroids = $(socket);
  $socketOnSteroids.socket = socket;
  return $socketOnSteroids;
})();


// Register a call to initialize as a jquery event handler
// init is triggered at the end of this script :P
$myelements.on("init", function Init() {
  $myelements.initialize();
});

// Debug-log every message received 
$myelements.socket.on("message", function onSocketIOMessage(message) {
  $myelements.debug("myelements library received socket.io 'message' event from backend: %j", message);
  $myelements.debug("Updating browser storage for message '%s'", message.event);
  localforage.setItem(message.event, message.data).then(function localForageSetItemHandler(data) {
    $myelements.debug("Updated browser storage for message '%s' with: %j", message.event, message.data);
  }, function localforageSetItemErrorHandler(error) {
    console.error("myelements.jquery: Error in localforage.setItem: ", error);
  });
});

// Debug-log every error emitted by socket.io 
$myelements.socket.on("error", function socketIOErrorHandler() {
  $myelements.debug("Socket emitted 'error'", arguments);
});

/**
 * myelements default options
 *   - {String} select. jQuery selector used for automatically initializing `myelements`
 *     on selected elements.
 *   - {debu()} debug. An instance of the debugger library
 */
$.extend($myelements, {
  selector: ".myelement",
  debug: debug("myelements:client"),
  /**
   * Initializes the `myelements library
   *   - Attaches the emitting of the online & offline events to the browser events
   */
  initialize: function() {
    var _this = this;
    // trigger jQuery event online
    this.whenOnline(function() {
      $(_this).trigger("online");
    });
    // trigger jQuery event offline
    this.whenOffline(function() {
      $(_this).trigger("offline");
    });
    $myelements.debug("myelements initialized");
  },
  /**
   * Initializes an element to give it the functionality
   * provided by the myelements library
   *
   * @param {HTMLElement} element. the element to initialize
   * @param {Object} options. options for initReactOnDataupdate,
   *   initReactOnUserInput and initReactOnMessage.
   */
  initializeElement: function(element, options) {

    var $el = $(element);
    // React on every server/socket.io message.
    // If the element is defined with a data-react-on-event attribute
    // we take that as an eventType the user wants to be warned on this
    // element and we forward the event via jQuery events on $(this).
    this.initReactOnEveryMessage($el, options.reactOnMessage);

    // React on server message.
    // If the element is defined with a data-react-on-event attribute
    // we take that as an eventType the user wants to be warned on this
    // element and we forward the event via jQuery events on $(this).
    if (options.reactOnMessage) {
      this.initReactOnMessage($el, options.reactOnMessage);
    }
    // React on events originated from a data update in the backend
    // The user decides which object wants to be notified from with the
    // attribute data-react-on-dataupdate
    if (options.reactOnDataupdate) {
      this.initReactOnDataupdate($el, options.reactOnDataupdate);

    }
    if (options.reactOnUserinput) {
      // And make every form submit trigger the userinput message
      this.initReactOnUserInput($el, options.reactOnUserinput);
    }
    // react on routes updates using page.js 
    // the attribute  data-react-on-page holds the route 
    // that is passed to page(...);
    if (options.onRoute) {
      this.initOnRoute($el, options.onRoute);
    }
    $myelements.attachDefaultEventHandlers(element);
    // Render first time. empty. passing data- attributes
    // as locals to the EJS engine.
    // TODO: Should load from localstorage.
    // Take the innerHTML as a template.
    $myelements.updateElementScope(element);


    // Init page routing using page.js
    // multiple calls to page() are ignored 
    // so it's safe to callit on every element initialization
    page();
    $(element).trigger("init");
  },
  /**
   * Updates the data associated to an element trying to re-render the template
   * associated to the element.
   * with the values from 'data' as scope.
   *
   * If data is empty, it tries to load data for this element
   * from browser storage (indexedDB/localStorage).
   *
   * @param {HTMLElement} el. The element the update affects.
   * @param {Object} data. If not undefined, this object is used
   *   as the scope for rendering the innher html of the element as a template
   */
  updateElementScope: function(el, data) {
    var dataupdateScope = $(el).data().reactOnDataupdate;
    var templateScope = $(el).data().templateScope;
    var userinputScope = $(el).data().reactOnUserinput;
    if (data) {
      $myelements.doRender(el, data);
    } else if (!data && templateScope) {
      $myelements.recoverTemplateScopeFromCache(el, templateScope);
      return;
    } else if (!data && dataupdateScope) {
      $myelements.recoverTemplateScopeFromCache(el, dataupdateScope);
      return;
    } else if (!data && userinputScope) {
      $myelements.recoverTemplateScopeFromCache(el, userinputScope);
    }
  },
  /**
   * Recovers and element's event scope from browser storage.
   *
   * @param {HTMLElement} el. The element you are trying to recover the scope from.
   * @param {String} scope. The scope name to recover.
   */
  recoverTemplateScopeFromCache: function(el, scope) {
    var tplScopeObject = {};

    $myelements.debug("Trying to update Element Scope without data from scope: %s", scope);
    // If no data is passed
    // we look up in localstorage
    $myelements.localDataForElement(el, scope, function onLocalDataForElement(err, data) {
      if (err) {
        // Maybe this is useless if there's no data to update.
        // If I don't do this, the element keeps its EJS tags untouched
        $myelements.debug("Updating element scope with empty object");
        // Default to [] because it's an object and its iterable. 
        // This way EJS templates cand use $().each to avoid 'undefined'errors
        data = [];
      }
      tplScopeObject[scope] = data;
      $myelements.doRender(el, tplScopeObject);
    });
  },
  /** 
   * Returns localstorage data (if any) for a specific message
   *
   * @param {HTMLElement} element
   * @param {String} dataId, message scope identifier
   * @param {Function} cb.
   */
  localDataForElement: function(element, dataId, cb) {
    localforage.getItem(dataId, function localforageGetItemCallback(err, data) {
      $myelements.debug("Trying to get localstorage data for scope: %s", dataId);
      if (err) {
        return cb(err, data);
      }
      if (!data) {
        $myelements.debug("No localstorage for scope: %s", dataId);
        return cb(new Error("No localstorage data for DataId " + dataId));
      } else {
        $myelements.debug("Got localstorage for scope: %s", dataId);
        return cb(null, data);
      }
    });
  },
  /**
   * Re render the element template. It saves it because
   * on every render, the EJS tags get dumped, so we compile
   * the template only once.
   *
   * @param {HTMLElement} el
   * @param {Object} scope data to be passed to the EJS template render.
   * @param {Function} done called when rendering is done
   *   - {Error} err. Null if nothing bad happened
   *   - {Jquery collection} $el. the element that was rendered.
   *   - {Object} data. scope data passed to doRender
   */
  doRender: function(el, data, done) {

    if (!el.template) {
      $myelements.debug("Creating EJS template from innerHTML for element: ", el);
      // Save the compiled template only once
      try {
        el.template = new EJS({
          element: el
        });

      } catch (e) {
        console.error("myelements.jquery: Error parsing element's innerHTML as an EJS template: ", e.toString(),
          "\nThis parsing error usually happens when there are syntax errors in your EJS code.",
          "\nThe elements that errored is ", el);
        el.template = undefined;
        return;
      }
    }
    try {
      // pass a locals variable as render scope`
      var html = el.template.render({
        locals: data
      });
    } catch (e) {
      console.error("myelements.jquery: Error rendering element's template: ", e.toString(),
        "\nThis rendering error usually happens when refering an undefined variable.",
        "\nThe elements that errored is ", el);
      return;
    }
    el.innerHTML = html;
    // $this.html(html);

    // Ensure every form in the element
    // is submitted via myelements.
    // Called after render because the original forms get dumped on render
    $myelements.handleFormSubmissions(el);
    if (typeof done === "function") {
      return done(html);
    }
  },
  /**
   * Calls cb when the app is online with the backend
   *
   * @param {Function} cb;
   */
  whenOnline: function(cb) {
    // If we're inside phonegap use its event.
    if (window.phonegap) {
      return document.addEventListener("online", cb, false);
    } else if (window.addEventListener) {
      // With the online HTML5 event from the window
      this.addLocalEventListener(window, "online", cb);
    } else {
      /*
      Works in IE with the Work Offline option in the 
      File menu and pulling the ethernet cable
      Ref: http://robertnyman.com/html5/offline/online-offline-events.html
    */
      document.body.ononline = cb;
    }
  },
  /**
   * Calls cb when the app is offline from the backend
   *
   * TODO: Find a kludge for this, for Firefox. Firefox only triggers offline when
   * the user sets the browser to "Offline mode"
   *
   * @param {Function} cb.
   */
  whenOffline: function(cb) {
    // If we're inside phonegap use its event.
    if (window.phonegap) {
      return document.addEventListener("offline", cb, false);
    } else if (window.addEventListener) {
      // With the offline HTML5 event from the window
      this.addLocalEventListener(window, "offline", cb);
    } else {
      /*
      Works in IE with the Work Offline option in the 
      File menu and pulling the ethernet cable
      Ref: http://robertnyman.com/html5/offline/online-offline-events.html
    */
      document.body.onoffline = cb;
    }
  },
  /**
   * Adds an event listener for document. Mainly used for listening to
   * offline or online events
   * TODO: Refactor this.
   *
   * @param el
   * @param type
   * @param {Function} fn
   */
  addLocalEventListener: (function() {
    if (document.addEventListener) {
      return function(el, type, fn) {
        if (el && el.nodeName || el === window) {
          el.addEventListener(type, fn, false);
        } else if (el && el.length) {
          debug("WTF at addLocalEventListener!");
        }
      };
    } else {
      return function(el, type, fn) {
        if (el && el.nodeName || el === window) {
          el.attachEvent("on" + type, function() {
            return fn.call(el, window.event);
          });
        } else if (el && el.length) {
          debug("WTF at addLocalEventListener!");
        }
      };
    }
  })(),
  /*
   * Gets an en element to trigger jQuery events like
   * - offline
   * - online
   * - disconnect
   * - connect
   * - reconnect
   * - reconnecting
   * - reconnect_error
   * - reconnect_failed
   *
   * @param {HTMLElement} element.
   */
  attachDefaultEventHandlers: function(element) {
    var $el = $(element);
    //send online and offline events for every element

    // THIS ARE EVENTS GENERATED BY THE AGENT 
    // (BROWSER OR WEB VIEW IN PHONEGAP)
    $myelements.on("offline", function onElementOffline() {
      $el.trigger("offline");
    });
    $myelements.on("online", function onElementOnline() {
      $el.trigger("online");
    });

    // THIS ARE EVENTS GENERATED BY SOCKET.IO.

    // Fired upon a disconnection.
    $myelements.socket.on("disconnect", function onDisconnect() {
      $el.trigger("disconnect");
    });
    // send socket connect events
    $myelements.socket.on("connect", function onConnect() {
      $el.trigger("connect");
    });
    // Fired upon a successful reconnection.
    $myelements.socket.on("reconnect", function onReconnect() {
      $el.trigger("reconnect");
    });
    // Fired upon an attempt to reconnect.
    $myelements.socket.on("reconnecting", function onReconnecting() {
      $el.trigger("reconnecting");
    });
    //Fired upon a reconnection attempt error.
    $myelements.socket.on("reconnect_error", function onReconnectError() {
      $el.trigger("reconnect_error");
    });
    //Fired when couldn’t reconnect within reconnectionAttempts
    $myelements.socket.on("reconnect_failed", function onReconnectFailed() {
      $el.trigger("reconnect_failed");
    });

    // Trigger userinput event on automatic formsubmit event.
    $el.on("formsubmit", function onFormSubmit(ev, data) {
      $el.trigger("userinput", data);
    });
  },


  initOnRoute: function($el, route) {
    page(route, function routeHandler(context, next) {
      debug("page.js route handler called with context %j and next === %s", context, next);
      $el.trigger("route", context);
      // I don't know yet what is next() useful for in this case
      //next();
    });
  },
  /**
   * Prepares HTML elements for being able to receive socket.io's messages
   * as jQuery events on the element
   *
   */
  initReactOnEveryMessage: function($el) {
    // Reaction to socket.io messages
    $myelements.socket.on("message", function onMessage(message) {
      if ($el.data().templateScope === message.event) {
        // Update element scope (maybe re-render)
        var scope = {};
        scope[message.event] = message.data;
        $myelements.updateElementScope($el.get(0), scope);
      }

      // we forward socket.io's message as a jQuery event on the $el.
      $myelements.debug("forwarding backend message '%s' as jQuery event '%s' to element %s with data: %j", message.event, message.event, $el.get(0), message.data);
      // Kludge: If jQuery's trigger received an array as second parameters
      // it assumes you're trying to send multiple parameters to the event handlers,
      // so we enclose message.data in another array if message.data is an array
      // sent from the backend 
      if ($.isArray(message.data)) {
        $el.trigger(message.event, [message.data]);
      } else {
        $el.trigger(message.event, message.data);
      }
    });
    // Reaction on local events triggered on the element by jQuery
    $el.on("message", function onElementMessageEvent(jQueryEvent, message) {
      if (message.event === undefined || message.data === undefined) {
        $myelements.debug("event key or data not present in second argument to trigger()", message.event, message.data);
        console.error("myelements.jquery: $.fn.trigger('message') must be called with an object having the keys 'event' and 'data' as second argument.  ");
        return;
      }
      $myelements.debug("Sending message '%s' to backend with data: %j", message.event, message.data);
      $myelements.socket.send(message);
    });
  },
  initReactOnMessage: function($el) {
    $myelements.socket.on("message", function onSocketIOMessage(message) {
      $myelements.debug("myelements message '%s' caught by data-react-on-message", message.reactOnMessage);
      // Forward the event to this element with jQuery
      $el.trigger("message", message);
    });
  },
  initReactOnUserInput: function($el, scope) {
    $el.on("userinput", function onUserinput(event, inputData) {
      localforage.setItem(scope, inputData, function(data) {
        debug("Storing userinput data int browser: %s", JSON.stringify(data));
      });
      if ($myelements.socket.connected) {
        $myelements.socket.send({
          event: "userinput",
          data: inputData,
          scope: scope
        }, function() {
          $el.trigger("userinput_success", inputData);
        });

      } else {
        debug("user input failed for scope %s", scope);
        $el.trigger("userinput_failed", inputData);
      }
    });
  },
  initReactOnDataupdate: function($el, scope) {
    $myelements.socket.on("message", function onSocketIOMessage(message) {
      if (message.event === "dataupdate" && message.data[scope]) {
        var messageData = message.data[scope];
        $myelements.debug("Storing local data for scope '%s': %j", scope, message.data[scope]);
        localforage.setItem(scope, messageData, function localForageSetItemHandler(data) {
          debug("localforage setItem called with data %j", data);
          // Acá creo que anda malllll
        });
        $el.trigger("dataupdate", message.data);
        // Update element scope (maybe re-render)
        $myelements.debug("'dataupdate' message received from myelements backend");
        $myelements.debug("Updating element scope data: %j", message.data);
        $myelements.updateElementScope($el.get(0), message.data);
      }
    });
  },
  handleFormSubmissions: function(element) {
    var $el = $(element);
    var $forms = $el.find("form");
    if (!$forms.length) {
      return;
    }
    $forms.submit(function onFormsSubmit(ev) {
      debug("Form submitted: %j", ev);
      var inputData = $(this).serializeArray().reduce(function reduceInputs(a, b) {
        a[b.name] = b.value;
        return a;
      }, {});
      $el.trigger("formsubmit", inputData);
      $myelements.debug("Avoiding default submit event");
      //avoid forms submit propagation
      return false;
    });
  },


  parseQueryParam: function(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split("&");
    for (var i = 0; i < sURLVariables.length; i++) {
      var sParameterName = sURLVariables[i].split("=");
      if (sParameterName[0] === sParam) {
        return sParameterName[1];
      }
    }
  },

  recoverPath: function() {
    var recoverRoute = $myelements.parseQueryParam("route");
    if (recoverRoute) {
      page(recoverRoute);
      page();
    }
  }
});


$myelements.trigger("init");

$(function() {
  $($myelements.selector).each(function() {
    $(this).myelement();
    //myelements.initializeElement(this);
  });


});
/**
 *
 * Useful reading about this interface
 * ===================================
 * Tips for Developing jQuery UI 1.8 Widgets
 * http://www.erichynds.com/blog/tips-for-developing-jquery-ui-widgets
 * http://learn.jquery.com/jquery-ui/widget-factory/widget-method-invocation/
 * Method Invocation
 */

window.MyElement = $.widget("myelements.myelement", {
  _create: function() {

    var dataAttributeOptions = this.element.data();
    this.options = $.extend(dataAttributeOptions, this.options);
  },
  _init: function() {
    // Get parameters set as data- attributes
    $myelements.initializeElement(this.element.get(0), this.options);
  }
});


/**
 * Send a socket.io message to the server
 * @param {String} message's event name
 * @param {String|Array|Object} data. message payload.
 */
(function($) {
  $.fn.send = function(event, data) {
    this.trigger("message", {
      event: event,
      data: data
    });
  }

}(jQuery));