# myElements.jquery

A jQuery interface that allows any HTML element to behave **optimistically** and aware of **offline state**, **backend messages**, **backend data updates** and **URL route updates**.

Useful if you love doing things the [jQuery](http://jquery.com/) way, you like [socket.io](http://socket.io/) and [express](http://expressjs.com/) apps.

* [Installation](#installation)
* [Usage](#usage)
* **API**
 * [Client API](#client-api)
  * [Element Events](#element-events)
 * [Backend API](#backend-api)
  * [Backend Events](#backend-events) 
   
  
## Overview

**myelements.jquery** allows you to bind an element to backend events and 
consume them like you consume any jQuery events, 
like for example `$("#el").on("disconnect", callback);`.

##Installation

**myelements** works in any HTML5 compatible browser with an nodejs express() app as a backend. 

```shell
$ npm install myelements.jquery
```

## Loading

###In the backend

An `index.js` for example:

```js
// Standard express app usage 
// attached to a user-created http.Server
var express = require("express"),
  app = express(),
  server = require("http").createServer(app),
  myelements = require("myelements.jquery");

myelements(app, server);
app.use(express.static(__dirname));

server.listen(3000);
```

###In the browser 

When you attach **myelements** to your express app, it sets the route `/myelements.jquery.js` 
with the required client (browser) source. And you can add it to your HTML like this.

The `index.html`

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JS Bin</title>
</head>
<body>
  <!-- We will improve this element calling $("#el").myelement() -->
  <div id="el">
    This <code>div</code> responds to offline/online events.
  </div>
  <script src="http://code.jquery.com/jquery-1.10.2.min.js"></script>
  <script src = "/myelements.jquery.js"></script>
  <script>
    // Make the element reactive to new events
    $("#el").myelement()
      // React to offline event
      .on("offline", function() {
     $(this).html("Can't reach the Internet!!!");
      // React to offline event
    }).on("online", function() {
      $(this).html("We're back online");
    });
  </script>
</body>
</html>
```



##Features

**History API PushState reactiveness**: You can make any HTML Element react 
to a self emitted `page` event that triggers when the URL matches anything you want.

**Offline data synchronization**: Every element can declare to be binded
 to a data object that is updated on `dataupdate` events from the server 
 but the element can also rely on a local copy of the last state of the 
 data stored in localstorage automatically by myelements.jquery on every dataupdate event.

**Templates**: The element innerHTML is taken as a EJS template. 
So you can use expressions that will be automaticatillay binded to the events payload data.

## Usage

With this you make the element reactive to new events probided by the **myelements** library.

```
$("#myelement").myelement(options)
```

A little more in depth...

#### In the HTML

**myelements.jquery** is not fully automatic. You'll need to setup
 and designate a containing element on your page that will receive events.

```js
// Make an element warn you if it can't reach the internet.
$("#myelement").myelement().on("offline", function() {
 alert("Can't reach the Internet!!!");
});
```

Using templates for reacting automagically to backend `dataupdate` messages.

```html
<ul id="mylist">
  <!-- A regular EJS template that iterates over an array -->
  [% jQuery(data.lastTweets).each(function(i, tweet) { %]
    <li> @[%=tweet.user.screen_name%]: [%= tweet.text%] </li>
  [%})%]
</ul> <!--ul.myelement-->    
<script>
$("#mylist").myelement({
    reactOnDataupdate: "lastTweets",
});
// This event will only be fired when a dataupdate message for the scope `lastTweets` arrives
// declared for the 
$("#mylist").on("dataupdate", function() {
 console.log("lastTweets updates");
});
</script>
```

#### In Node

```js
var app = require("express")(),
  httpServer = require("http").createServer(app);
// Attach my elements to an express app and an http/https server
myelements(app, httpServer); 
// myelements emits this event every time a myelements client connects
app.on("myelements client connected", function onClientConnected(client) {
  client.trigger("dataupdate", {
     lastTweets: []
  });
});
```


###Usage via markup

You can apply the class `myelement` and it  myelement() will be called automatically on every HTML with this class.


```js
<div id="el" class="myelement">
  <!-- Element content can be regular HTML or EJS template that uses [% and %] as delimiters -->
  Hello [%=data.name%]. 
  <!-- Every template has the variable 'data' defined -->
</div>
<script>
$(function() {
  $("el").on("message", function(message) {
    console.log(message.event, message.data);
  });
});
</script>
```

### Data  Attributes for the elements

Some of the options for myelement() can be specified on the HTML element markup by de-camelizing the option name the usual mapping expected for jQuerys .data() method);


* `data-react-on-message`. Equivalent to option `reactOnMessage`.
* `data-react-on-dataupdate`. Equivalent to option `reactOnDataupdate`.
* `data-react-on-page`. Equivalent to option `reactOnPage`.
* `data-react-on-userinput`. Equivalent to option `ractOnUserinput`.

## API

* [Client API](#client-api)
* [Backend API](#backend-api)

### Client API

The client part of **myelements** is jQuery-ishy and jQuery events mainly. You can expect the regular behaviour from a well know jQuery plugin.

Appart form interacting with elements and the backend via a jquery-like API, you may want
to alter some of the default parameters used by **socket.io** with **pre-initialization options**.

#### Pre-initialization options

    // Do this before the <script></script> that load myelements.jquery.js
    window.myelementsOptions = {...}

**The defaults are:**

    {
      // Host or host:port for the backend 
      socketHost: undefined,
      // socket.io namespace used by myelements
      socketNamespace: "/myelements",
      // socket.io HTTP URL used by meyelements socket.io Manager instance
      socketPath: "/socket.io",
    }

#### Initializing an element

```
$(<selector>).myelement(<options>)
```

##### Options

* `reactOnMessage`: 
* `reactOnDataUpdate`: 
* `reactOnPage`: 
* `reactOnUserinput`: 


#### Element Events


You listen to them like

```js
$("#el").on("disconnect", function() {
  $(this).html("We cannot reach the backend now").fadeOut().fadeIn();
});
```

#####Internet connectivity related events

* **offline**: Fired upon inability from the agent (browser or web view in phonegap) for detecting Internet conectivity.
* **online**: Fired upon an intent and on acquiring ability from the agent to connect to the Internet.

##### Backend connectivity related events

*These events are the events fired by the socket.io client used by* **myelements.jquery**.

* **disconnect**: Fired upon a disconnection from backend.
* **reconnect**:Fired upon a successful connection to the backend.
* **reconnecting**:Fired upon an attempt to reconnect to the backend.
* **reconnect_error**:Fired upon a backend reconnection attempt error.
* **reconnect_failed**:Fired when couldn’t reconnect to the backend after trying a lot of times.
* **connect**:Fired on send socket connect events

##### History API, PushState related events

* **page**: Fired when the URL matches the value of element's option `reactOnPage`.
*Compatibility note:* **myelements.jquery** only works with browsers that support the history.pushState API.



#### Data-update loop and user input related events

**userinput**: Fired when the user inputs data or an event. For examples, when some form inside the element is submitted. You can trigger this event in order to tell the library about user input related activity. 

##### userinput event Example
```js
// Make the element react on user input and send the backend a scoped message 
$("#myel").myelement({
  reactOnUserinput: "chatStatusChanged"
  // Make a button inside the element trigger a userinput message to the backend
}).find("button").on("click", function() {
  $("#myel").trigger("userinput", {
    "newStatus": offline
  });
});
```

On the server you have
```js
client.on("chatStatusChanged", function(data) {
   console.log(data.newStatus);
});
```

##### userinput_failed

Fired when the userinput message could not be acknowledged by the backend.

##### userinput_success

Fired when the userinput message was acknowledged by the backend.

##### dataupdate

#### Generic message events

##### message

A generic message event triggered on **every** message sent from the backend. You send this messages from the backend with the `trigger()` method.

##### State related events

######init
Fired on element initialization. Useful for extending `myelements` reactions on events.


##### trigger(messageType, messageData)


####on(event, callback)

### Backend API

####Initialization

    myelements(app, server, options)

**Default options**

    

    {
      // socket instance
      sockets: null,
      // Default socket.io namespaced used by myelements
      socketNamespace: "/myelements",
      socketPath: "/socket.io",
      // Use no session middleware by default.
      session: undefined
    }


#### Backend Events

####Backend Methods

##### trigger(messageType, messageData)

##### on(event, callback)

##### _broadcast(messageType, messageData)


###Rationale


**myelements.jquery** relies on [socket.io](http://socket.io/) in order to be 
aware of backend events like messages, data updates, etc.

This library is based on thoughts after watching [The 7 Principles of rich web applications](https://www.youtube.com/watch?v=p2F-128e3sI) by [rauchg](https://github.com/rauchg).
*There's also an [essay](http://rauchg.com/2014/7-principles-of-rich-web-applications/) written about this subjects*. 

After watching that talk I thought about this expected behaviour from a Single Page Applications applied to a single HTML element instead of a whole app.

The principles stated there are:

1. **Allow to get content in a single hop.**
2. **React inmediatelly to user input**. Mask latency. Layout adaptation
3. **Making of all our UIs** or the application **eventually consistent**.
   Immediate file representation. (e.g. on Cloudup uploads).
4. **Fine grain control of how we send data back and forth from the app to
   the server**. Automatic retrying when the servers goes down. Detecting
   session invalidation. Handle 403s gracefully.
5. **Enhancing history support**. Fast-back->We can cache the representatoin
   of the latest page so wen we go back, we render it inmediately.
   Scrollback memory. Remembering scrolling position.
6. **Code updates**. (e.g. using the page visibility API to refresh the page on user's behalf).
   Tell the server wich code state (frontend version) is sending data.
7. **The idea of predictive behaviours**. Try to guess what the user is gonna do.
   Mouse direction, preload on hover or on mousedown (old gmail's way).

Consequences from avoiding the principles.
 - We disabled scraping.
 - We broke the back button.
 - 14kb takes xxx milliseconds.
 - 1seconds is the end of realtime perception.
 - 0.1 second is the threshold in which the user no longer feels is
   interacting with the data.

Also inspired by this other video [The Future of Real-Time with Guillermo Rauch](https://www.youtube.com/watch?v=_8CykecwKhw)

The frontend needs to be able to handle a variety of scenarios:
 - Session expiration
 - User login change
 - Very large data deltas (eg: newsfeeds)
 (Don't make your frontend always relay on a complete event log of changes).


### License

MIT
