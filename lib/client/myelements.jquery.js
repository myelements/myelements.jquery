/**
 * TODO
 * HANDLE LOCALSTORAGE
 * DOUBLE - CHECK offline AND online EVENTS.I 'm getting multiple online right now
 * ENSURE CORS ON BACKEND
 * FORCE RELOAD PAGE ON "reconnect_failed"
 EVENT.
 * DECLARE CLIENT VERSION on etag
 *
 * Implemented as
 *   - Express middleware
 *   - jQuery plugin.
 *
 * Inspired by this video.
 *
 * The 7 Principles of rich web applications - Guillermo Rauch
 *     https://www.youtube.com/watch?v=p2F-128e3sI
 * 1 - Allow to get content in a single hop.
 * 2 - React inmediatelly to user input. Mask latency. Layout adaptation
 * 3 - Making of all our UIs
 for the application eventually consistent.
 *     Immediate file representation. (e.g. on Cloudup uploads).
 * 4 - Fine grain control of how we send data back and forth from the app to
 *     the server. Automatic retrying when the servers goes down. Detecting
 *     session invalidation. Handle 403s gracefully.
 * 5 - Enhancing history support. Fast-back->We can cache the representatoin
 *     of the latest page so wen we go back, we render it inmediately.
 *     Scrollback memory. Remembering scrolling position.
 * 6 - Code updates. (e.g. using the page visibility API to refresh the page on user's behalf).
 *     Tell the server wich code state (frontend version) is sending data.
 * 7 - The idea of predictive behaviours. Try to guess what the user is gonna do.
 *     Mouse direction, preload on hover or on mousedown (old gmail's way).
 *
 * Consequences from avoiding the principles.
 *   - We disabled scraping.
 *   - We broke the back button.
 *   - 14kb takes xxx milliseconds.
 *   - 1seconds is the end of realtime perception.
 *   - 0.1 second is the threshold in which the user no longer feels is
 *     interacting with the data.
 *
 * Also inspired by this other video https://www.youtube.com/watch?v=wsov4lUE2yM
 *
 * The frontend need to be able to handle a variety of scenarios:
 *   - Session expiration
 *   - User login change
 *   - Very large data deltas (eg: newsfeeds)
 *   (Don't make your frontend always relay on a complete event log of changes).
 *
 */
//localStorage.debug = '';

/** 
 * myelements is an instance of io.Socket
 * io.Socket inherits from EventEmitter
 *
 * Internally:
 * - It interfaces with the UI (i.e local events) via jQuery with $(myelements).trigger
 * - It interfaces with the server (i.e. backended events) via socket.io's .send()
 */
myelements = io.connect("/myelements");

$myelements = $(myelements);

// Register a call to initialize as a jquery event handler
// init is triggered at the end of this script :P
$myelements.on("init", function Init() {
  myelements.initialize();
});

myelements.on("error", function() {
  myelements.debug("My elements emitted an error", arguments);

});

// myelements properties
jQuery.extend(myelements, {
  selector: ".myelement",
  debug: debug("myelements:client"),
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
    myelements.debug("myelements initialized");
  },

  initializeElement: function(element) {
    myelements.processDataAttributes(element);
    myelements.attachDefaultEventHandlers(element);
    // Render first time. empty. passing data- attributes
    // as locals to the EJS engine.
    // TODO: Should load from localstorage.
    // Take the innerHTML as a template.
    myelements.updateElementScope(element);


    // Init page routing using page.js
    // multiple calls to page() are ignored 
    // so it's safe to callit on every element initialization
    page();
    $(element).trigger("init");
  },
  /**
   * Updates de data associated to an element
   * trying to re-render the template associated to the element.
   * with the values from 'data'as scope.
   * If data is empty, it tries to load data for this element
   * stored in browser, in order to improve user experience on load.
   * @param {HTMLElement} el.
   * @param {Object} data.
   */
  updateElementScope: function(el, data) {
    var dataupdateScope = $(el).data().reactOnDataupdate;
    var userinputScope = $(el).data().reactOnUserinput;
    var tplScopeObject = {};
    if (data) {
      myelements.doRender(el, data);
    } else if (!data && dataupdateScope) {
      myelements.recoverScopeFromCache(el, dataupdateScope);
      return;
    } else if (!data && userinputScope) {
      var scope = userinputScope;
      myelements.recoverScopeFromCache(el, userinputScope);

    }
  },
  recoverScopeFromCache: function(el, scope) {
    var tplScopeObject = {};

    myelements.debug("Trying to update Element Scope without data from scope: %s", scope);
    // If no data is passed
    // we look up in localstorage
    myelements.localDataForElement(el, scope, function onLocalDataForElement(err, data) {
      if (err) {
        // Maybe this is useless if there's no data to update.
        // If I don't do this, the element keeps its EJS tags untouched
        myelements.debug("Err: Updating element scope with empty object");
        // Default to [] because it's an object and its iterable. 
        // This way EJS templates cand use $().each to avoid 'undefined'errors
        data = [];
      }
      tplScopeObject[scope] = data;
      myelements.doRender(el, tplScopeObject);
    });
  },
  /** 
   * Returns localstorage data (if any) for a specific message
   * @param {HTMLElement} element
   * @param {String} dataId, message scope identifier
   * @param {Function} cb.
   */
  localDataForElement: function(element, dataId, cb) {
    localforage.getItem(dataId, function(err, data) {
      myelements.debug("Trying to get localstorage data for scope: %s", dataId);
      if (err) {
        return cb(err, data);
      }
      if (!data) {
        myelements.debug("No localstorage for scope: %s", dataId);
        return cb(new Error("No localstorage data for DataId " + dataId));
      } else {
        myelements.debug("Got localstorage for scope: %s", dataId);
        return cb(null, data);
      }
    });
  },
  /**
   * Re render the element template. It saves it because
   * on every render, the EJS tags get dumped, so we compile
   * the template only once.
   * @param {HTMLElement} el
   * @param {Object} scope data to be handled to the EJS template
   */
  doRender: function(el, data) {

    if (!el.template) {
      myelements.debug("Creating template for element with id %s", el.id)
      // Save the compiled template only once
      el.template = new EJS({
        element: el
      });
    }
    var html = el.template.render({
      data: data
    });
    el.innerHTML = html;
    // $this.html(html);

    // Ensure every form in the element
    // is submitted via myelements.
    // Called after render because the original forms get dumped on render
    myelements.handleFormSubmissions(el);
  },
  /**
   * Calls cb when the app is online with the backend
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
   * TODO: fix this for Firefox. Firefox only triggers offline when
   * the user sets the browser to "Offline mode"
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
          for (var i = 0; i < el.length; i++) {
            addEvent(el[i], type, fn);
          }
        }
      };
    } else {
      return function(el, type, fn) {
        if (el && el.nodeName || el === window) {
          el.attachEvent("on" + type, function() {
            return fn.call(el, window.event);
          });
        } else if (el && el.length) {
          for (var i = 0; i < el.length; i++) {
            addEvent(el[i], type, fn);
          }
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
    myelements.on("disconnect", function() {
      $el.trigger("disconnect");
    });
    // send socket connect events
    myelements.on("connect", function() {
      $el.trigger("connect");
    });
    // Fired upon a successful reconnection.
    myelements.on("reconnect", function() {
      $el.trigger("reconnect");
    });
    // Fired upon an attempt to reconnect.
    myelements.on("reconnecting", function() {
      $el.trigger("reconnecting");
    });
    //Fired upon a reconnection attempt error.
    myelements.on("reconnect_error", function() {
      $el.trigger("reconnect_error");
    });
    //Fired when couldn’t reconnect within reconnectionAttempts
    myelements.on("reconnect_failed", function() {
      $el.trigger("reconnect_failed");
    });

    // Trigger userinput event on automatic formsubmit event.
    $el.on("formsubmit", function onFormSubmit(ev, data) {
      $el.trigger("userinput", data);
    })
  },

  processDataAttributes: function(element) {
    var $el = $(element);
    // Get parameters set as data- attributes
    var data = $el.data();

    // React on server message.
    // If the element is defined with a data-react-on-event attribute
    // we take that as an eventType the user wants to be warned on this
    // element and we forward the event via jQuery events on $(this).
    if (data.reactOnMessage) {
      myelements.on("message", function(message) {
        myelements.debug("myelements message '%s' caught by data-react-on-event", data.reactOnMessage);
        // Forward the event to this element with jQuery
        $el.trigger(data.reactOnMessage);
      });
    }
    // React on events originated from a data update in the backend
    // The user decides which object wants to be notified from with the
    // attribute data-reac-on-dataupdate
    if (data.reactOnDataupdate) {
      var scope = data.reactOnDataupdate;
      myelements.on("message", function(message) {
        if (message.event === "dataupdate" && message.data[scope]) {
          var messageData = message.data[scope];
          myelements.debug("Storing local data for scope '%s'", scope);
          myelements.debug(message.data[scope])
          localforage.setItem(scope, messageData, function(data) {

          });
          $el.trigger("dataupdate", message.data);
          // Update element scope (maybe re-render)
          myelements.debug("dataupdate message received from backend. Updating element scope data");
          myelements.updateElementScope(element, message.data);
        }
      });
    }
    if (data.reactOnUserinput) {
      var scope = data.reactOnUserinput;
      // And make every form submit trigger the userinput message
      $el.on("userinput", function(event, inputData) {
        localforage.setItem(scope, inputData, function(data) {
          debug("Storing userinput data int browser: %s", JSON.stringify(data));
        });
        if (myelements.connected) {
          myelements.send({
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
    }
    // react on page routes matching using page.js 
    // the attribute  data-react-on-page holds the route 
    // that is passed to page(...);
    if (data.reactOnPage) {
      page(data.reactOnPage, function(context, next) {
        $el.trigger("page", context);
        // I don't know yet what is next() useful for in this case
        //next();
      });

    }
  },

  handleFormSubmissions: function(element) {
    var $el = $(element);
    var $forms = $el.find("form");
    if (!$forms.length) {
      return;
    }
    $forms.submit(function(ev) {
      var inputData = $(this).serializeArray().reduce(function(a, b) {
        a[b.name] = b.value;
        return a;
      }, {});
      $el.trigger("formsubmit", inputData);
      myelements.debug("Avoiding default submit event");
      //avoid forms submit propagation
      return false;
    })
  },


  parseQueryParam: function(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split("&");
    for (var i = 0; i < sURLVariables.length; i++) {
      var sParameterName = sURLVariables[i].split("=");
      if (sParameterName[0] == sParam) {
        return sParameterName[1];
      }
    }
  },

  recoverPath: function() {
    var recoverRoute = myelements.parseQueryParam("route");
    if (recoverRoute) {
      page(recoverRoute);
      page();
    }
  }
});


$myelements.trigger("init");

$(function() {
  $(myelements.selector).each(function() {

    myelements.initializeElement(this);

  });


});

jQuery.widget("myelements.myelement", {
  _create: function() {},
  _init: function() {
    myelements.initializeElement(this.element.get(0));
    console.log("chwaska");
  }
});