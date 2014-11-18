# myElements.jquery

A jQuery interface that allows any HTML element to behave **optimistically** and aware of **offline state**, **backend messages**, **backend data updates** and **URL route updates**.

Useful if you love doing things the [jQuery](http://jquery.com/) way, you like [socket.io](http://socket.io/) and [express](http://expressjs.com/) apps.

* [Installation](#installation)
* [Usage](#usage)
* **API**
 * Client API
  * [Element Events](#element-events)
 * Backend API
  * [Backend Events](#backend-events) 
   
  
## Overview

**myelements.jquery** allows you to bind an element to backend events and 
consume them like you consume any jQuery events, 
like for example `$("#el").on("disconnect", callback);`.

##Installation

**myelements** works in any HTML5 compatible browser with an nodejs express() app as a backend. 

```shell
$ npm install myelements/myelements.jquery
```

###In the browser 

When you attach **myelements** to your express app, it sets the route `/myelements.jquery.js` with the required client (browser) source. And you can add it to your HTML like this.

```html
<script src="http://code.jquery.com/jquery-1.10.2.min.js"></script>
<script src = "/myelements.jquery.js"></script>
```

###In the backend

```js
// Standar express app usage without its own created http.Server
var app = require("express")();
var server = require("http").createServer(app);
var myelements = require("myelements.jquery");

myelements(app, server);
```

###Rationale


**myelements.jquery** relies on [socket.io](http://socket.io/) in order to be 
aware of backend events like messages, data updates, etc.

This library is based on thoughts after watching [The 7 Principles of rich web applications](https://www.youtube.com/watch?v=p2F-128e3sI) by @guille.
*There's also an [essay](http://rauchg.com/2014/7-principles-of-rich-web-applications/) written about this subjects*. 

After watching that talk I thought about this expected behaviour from a Single Page Applications applied to a single HTML element instead of a whole app.


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
 alert("Can't reach the Tnternet!!!");
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


* `data-react-on-message.`. Equivalent to option `reactOnMessage`.
* `data-react-on-dataupdate `. Equivalent to option `reactOnDataupdate`.
* `data-react-on-page`. Equivalent to option `reactOnPage`.
* `data-react-on-userinput`. Equivalent to option `ractOnUserinput`.

## API

### Client API

The client part of **myelements** is jQuery-ishy and jQuery events mainly. You can expect the regular behaviour from a well know jQuery plugin.

#### Initialization

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

######offline

Fired upon inability from the agent (browser or web view in phonegap) for detecting Internet conectivity.

######online

Fired upon an intent and on acquiring ability from the agent to connect to the Internet.

##### Backend connectivity related events

######disconnect
Fired upon a disconnection from backend.

######reconnect
Fired upon a successful connection to the backend.

######reconnecting
Fired upon an attempt to reconnect to the backend.

######reconnect_error
Fired upon a backend reconnection attempt error.

######reconnect_failed
Fired when couldn’t reconnect to the backend after trying a lot of times.

######connect
Fired on send socket connect events

##### History API, PushState related events

######page

Fired when the URL matches the value of element's option `reactOnPage`.
*Compatibility note:* **myelements.jquery** only works with browsers that support the history.pushState API.



#### Data-update loop and user input related events

##### userinput

Fired when the user inputs data or an event. For examples, when some form inside the element is submitted. You can trigger this event in order to tell the library about user input related activity. 

#######Example
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

#######reactOnUserinput

#######reactOnDataUpdate

#######reactOnMessage

##### Events

####on()

### Backend API

##### Events

#### Methods

##### trigger()

##### on()

### License

MIT
