# myElements.jquery

A jQuery interface that allows any HTML element to behave **optimistically** and aware of **offline state**, **backend messages**, **backend data updates** and **URL route updates**.

**myelements.jquery** allows you to bind an HTML element to backend events and 
consume them like you [consume any jQuery event](http://api.jquery.com/on/). Useful if you love doing things the [jQuery](http://jquery.com/) way and you like [express](http://expressjs.com/) apps empowered with [socket.io](http://socket.io/) .

## Installation

```shell
$ npm install myelements.jquery
```
   
## Requirements

**myelements** works within this client/server environment: 

* Any HTML5 compatible browser with jQuery loaded.
* A **NodeJS** `express()`  app as a backend. 

## Features

**Backend events as jQuery events**: You can `trigger()` an event in the backend
and it will be forwarded to every element that has been applied `$().myelement()` so you can
listen to the event like `$("#el").on("customEvent")`;

**History API PushState reactiveness**: You can make any HTML Element react 
to `.on("page")` event that triggers when the URL matches anything you want.

**Templates**: The element innerHTML is taken as a EJS template. You declare
which message will be the template scope. So, when a message arrives from the backend
the template is re-rendered.

**Templatest scope**: Elements can declare to be binded
 to messages data object that arrives  from the server.

**Offline data synchronization**: Every message received from the backend
is stored in browser storage. So the element can re-render its templates basing
its scope on a local copy of the last state of the data stored in localstorage
automatically by **myelements.jquery** on every message.


## Example

**In the backend**. An `index.js` for example:

```js
// Standard express app usage 
// attached to a user-created http.Server
var express = require("express"),
  app = express(),
  server = require("http").createServer(app),
  myelements = require("myelements.jquery");

// myelements attaching.
myelements(app, server);
// A simple express way to load a static index.html
app.use(express.static(__dirname));

server.listen(3000);
```

**In the browser**. 

When you attach **myelements** to your express app in the backend, it sets the route `/myelements/myelements.jquery.js` 
with the required client (browser) source. And you can add it to your HTML like this.



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
  <script src = "/myelements/myelements.jquery.js"></script>
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




# Documentation


* [Usage](#usage)
* [Client API](#client-api)
 * [Element Events](#element-events)
 * [Usage via markup](#usage-via-markup)
* [Backend API](#backend-api)
  * [Backend Events](#backend-events) 
  * [Backend Methods](#backend-methods) 
* [Rationale](#rationale) 

## Usage

Calling the `.myelement()` method (jquery) on an element makes the element reactive to new events provided by the **myelements** library.

```
$("#el").myelement(options)
```

**Sending messages in the backend**

    app.on("myelements:connection", function(client) {
      client.trigger("lastTweets", [
        { text: "Hi"}, { text: "Hello"}
      ]);
    });

**Receiving messages from the backend**

    $("#el").myelement().on("lastTweets", function(event, data) {
      $.each((data).foreach
    });


**Sending messages in the frontend**

    $("#el").trigger("newMessage", "hola");


**Receiving messages from the frontend**

    client.on("lastTweets", function(data) {
      data.foreach(function(val,i) {
        console.log("Item %s is %s", i, val);
      });
    });



### Usage example

#### In the HTML



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
app.on("myelements:connection", function onClientConnected(client) {
  client.trigger("dataupdate", {
     lastTweets: []
  });
});
```

## Client API

The client part of **myelements** is jQuery-ishy and jQuery events mainly. You can expect the regular behaviour from a well know jQuery plugin.

**myelements.jquery** is not fully automatic. You'll need to setup
 and designate a containing element on your page that will receive events.


### $(selector).myelement(options)
 
 Initializes HTML elements in order to receive the jQuery events provided by **myelements**.

__Arguments__
* `selector` -  A regular [jQuery selector](http://api.jquery.com/category/selectors/).
* `options`
  * `templateScope` -  A message name . When the frontend receives this message from the backend, the element's `innerHTML` will be interpreted as an EJS template and re-rendered with the event's data as a property of the `locals` object.


__Pre-initialization options__

You may want to alter some of the default parameters used by **socket.io** setting `window.myelementsOptions`
prior to loading **myelements.jquery**.

* `window.myelementsOptions` -  Set this object before the `<script>` tag that loads `myelements.jquery.js`.
  * `socketHost` -  Host or host:port for the backend. **Default**: `undefined`.
  * `socketNamespace` -  socket.io namespace used by myelements. **Default**: `"/myelements"`.
  * `socketPath` -  socket.io HTTP URL used by meyelements socket.io `io.Manager` instance **Default**: `"/socket.io"`.

**Example**

    <script src="http://code.jquery.com/jquery-1.10.2.min.js"></script>
    <script>
      window.myelementsOptions = {...};
    </script>
    <script src = "/myelements/myelements.jquery.js"></script>

### $(selector).send(event_name, data)

Sends a message to the backend. 

__Arguments__
* `selector` -  A jQuery selector for elements previously instantiated with `.myelement()`.
* `name` -  A message name . The message is sent via socket.io's `send()` method. As such it need an event name.
* `data` -  An `Object`, `Array` or `String` to send to the backend as payload data.

### $(selector).on(event_name, callback)

Listen for events on the element. The `.on` method works is the jQuery method `.on()`. The thing 
is that when **myelements** receive a socket.io's message from the backend it triggers is it 
on every element that has been initialized with **myelements.jquery**.

__Arguments__
* `selector` -  A jQuery selector for elements previously instantiated with `.myelement()`.
* `event_name` -  A message, event name . The message is sent in the backend via socket.io's `send()` method. As such you specify here an event name to match.
* `callback(jQueryEvent, event_data)` -  A function to be called when the message arrives. `event_data` is the emitted data with the event.



### Element Events

You listen to them like

```js
$("#el").on("disconnect", function() {
  $(this).html("We cannot reach the backend now").fadeOut().fadeIn();
});
```
**Internet connectivity related events**
 
* `offline` -  Fired upon inability from the agent (browser or web view in phonegap) for detecting Internet conectivity.
  **Example:**

        $("#el").myelement().on("offline", function() {
          alert("Can't reach the Internet!!!");
        });

* `online` -  Fired upon an intent and on acquiring ability from the agent to connect to the Internet.

**Backend connectivity related events**

*These events are the events fired by the socket.io client used by* `myelements.jquery**.

* `disconnect` -  Fired upon a disconnection from backend.
* `reconnect` - Fired upon a successful connection to the backend.
* `reconnecting` - Fired upon an attempt to reconnect to the backend.
* `reconnect_error` - Fired upon a backend reconnection attempt error.
* `reconnect_failed` - Fired when couldn’t reconnect to the backend after trying a lot of times.
* `connect` - Fired on send socket connect events

**History API, PushState related events**

* `route` -  Fired on each element, when the URL path changes.
.
*Compatibility note:* This events is fired only in browsers that support the [history.pushState API](http://diveintohtml5.info/history.html).



**Data-update loop and user input related events**

*`userinput` -  Fired when the user inputs data or an event. For examples, when some form inside the element is submitted. You can trigger this event in order to tell the library about user input related activity. 

**userinput event Example**
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

* `userinput_failed` -  Fired when the userinput message could not be acknowledged by the backend.
* `userinput_success` -  Fired when the userinput message was acknowledged by the backend.


**State related events**

* `init` -  Fired on element initialization. Useful for extending `myelements` reactions on events.

### Usage via markup

You can apply the class `myelement` and it  the jQuery method `myelement()` will be called automatically on every HTML with this class.

**Data attributes for the elements**

Some of the options for myelement() can be specified on the HTML element markup by de-camelizing the option name the usual mapping expected for jQuerys .data() method);

* `data-react-on-page`. Equivalent to option `reactOnPage`.
* `data-react-on-userinput`. Equivalent to option `ractOnUserinput`.
* `data-template-scope`. Equivalent to `.myelement()` `templateScope` option.



## Backend API

### myelements(app, server, options)

__Arguments__

* `app` __(required)__ - Express app.
* `server` __(required)__ -  http/https/spdy server
* `options` (optional)
  * `sockets` -  A previously instantianted `io.Server` instance in order for reuse it instead of using the one created internally by **myelements**. **Default:** `undefined`.
  * `socketNamespace` - Default socket.io namespace used by myelements. **Default:** `"/myelements"`.
  * `socketPath` - HTTP path on which to mount socket.io. **Default:** `"/socket.io"`.
  * `session` - A middleware to use as session handler. **Default:** `undefined`.

**Returns**

* `{Object}`
  * `io` - A socket.io `io.Server` instance.

**Example**

    var myelements = require("myelements");
    var frontend = myelements(app, server):

    frontend.io.on("connection", function(socket) {
      socket.trigger("greeting", "Nemo");
    });


### Backend Events

**myelements** emits events via `socket.io` on the socket.io server and on connected sockets.

* `connection` -  Fired on the object returned by myelements().io. This is the standard `connection` event fired by `socket.io` server.<br>**Example:**
     
        var frontend = require("myelements")(app, server):     
        
        frontend.io.on("myelements:connection", function(client) {
          console.log("myelements client connected");
        });

### Backend Methods

_These methods apply to the `socket` object you get when listening the `connection`
event emitted on the socket.io server instance used by **myelements**_. 

My elements adds three methods to a regular socket.io socket instance. 
These methods are just added for convenience because every message sent between
the frontend and the backend is done via socket.io's `send()` method. 

* `socket.trigger()`. Identical to `socket.send()`.
* `socket.broadcast.trigger()`. Identical to `socket.broadcast.send()`.
* `socket.on.message()`. Convenience method for listening just for messages.

#### socket.trigger(event, data)

Used to trigger messages on HTML elements in the frontend.

**Arguments**

* `event` - An event name.
* `data` - An `Array`, `String`, or `Object` to send as message data.


#### socket.on.message(event, callback)

Used to listen for jQuery events thrown by an HTML element in the frontend with the jQuery `trigger()` method.

#### socket.broadcast.trigger(event, data)

Idem to `socket.io`'s client `.broadcast.emit()` trigger an event on every frontend
connected to the server except this socket emitting the broadcast.

* `event` - An event name.
* `data` - An `Array`, `String`, or `Object` to send as message data.

### Rationale


**myelements.jquery** relies on [socket.io](http://socket.io/) in order to be 
aware of backend events like messages, data updates, etc.

This library is based on thoughts after watching [The 7 Principles of rich web applications](https://www.youtube.com/watch?v=p2F-128e3sI) by [rauchg](https://github.com/rauchg).
*There's also an [essay](http://rauchg.com/2014/7-principles-of-rich-web-applications/) written about this subjects*. 

After watching that talk I thought about this expected behaviour from a Single Page Application applied to a single HTML element instead of a whole app.

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

**Consequences from attaching to the principles.**

The frontend needs to be able to handle a variety of scenarios:
* Session expiration
* User login change
* Very large data deltas (eg: newsfeeds) (Don't make your frontend always relay on a complete event log of changes).


**Consequences from avoiding the principles:**

* We disabled scraping.
* We broke the back button.

 ** About the real time concept.**

* 14kb takes xxx milliseconds.
* 1seconds is the end of realtime perception.
* 0.1 second is the threshold in which the user no longer feels is
   interacting with the data.

Also inspired by this other video [The Future of Real-Time with Guillermo Rauch](https://www.youtube.com/watch?v=_8CykecwKhw)


## License 

The MIT License (MIT)

Copyright (c) 2014-2015 osk &lt;oscar@shovelapps.com&gt;

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
