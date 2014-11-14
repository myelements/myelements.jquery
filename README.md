# myElements.jquery

*Rich Web Applications like a sir...*

A jQuery interface that allows any HTML element to behave **optimistically** and aware of **offline state**, **backend messages**, **backend data updates** and **URL route updates**.

Useful if you love doing things the jQuery way, you like socket.io and express

##Installation

```sh
$ npm install myelements/myelements.jquery
```

###In the browser 
```html
<script src = "/myelements.jquery.js"></script>
```

###In the backend

```js
var server = require("http").createServer();
var app = require("express")();
var myelements = require("myelements.jquery");

myelements(app, server);

app.on("myelements client connected", function(client) {
  client.trigger("dataupdate", {
     lastItems: []
  });
});
```

### Example

```html
<ul class="myelement" data-react-on-dataupdate="lastTweets">
  [% jQuery(data.lastTweets).each(function(i, tweet) { %]
    <li> @[%=tweet.user.screen_name%]: [%= tweet.text%] </li>
  [%})%]
</ul> <!--ul.myelement-->    
$("#el").myelement({
    reactOnDataupdate: "lastTweets",

});
```



### Overview

**myelements.jquery** allows you to bind an element to backend events and 
consume them like you consume any jQuery events, 
like for example `.on("click", callback);`.

**myelements.jquery** relays on [socket.io](http://socket.io/) in order to be 
aware of backend events like messages, data updates, etc.

**myelements.jquery** can be used as a lighter replacement for the 
ModelView->Backend Pattern because it acts on an HTML element that is fully 
aware of the backend events and can send events to the backend in order to 
alter data, communicate in realtime or every other use you have already seen
socket.io allows you.

###Rationale

This library is based on thoughts after watching [The 7 Principles of rich web applications](https://www.youtube.com/watch?v=p2F-128e3sI) by @guille.
*There's also an [essay](http://rauchg.com/2014/7-principles-of-rich-web-applications/) written about this subjects*. 

After that watching that talk I thought why this expected behaviour from a Single Page Applications couldn't be reduced to a single
HTML element instead of a whole app (with **single** I mean any element).


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

**myelements.jquery** is not fully automatic. You'll need to setup
 and designate a containing element on your page that will receive events.

Every element that you want to be myelement must use the class myelement.

```js
<div id="my-element" class="myelement">
  <!-- Element content can be regular HTML or EJS template that uses [% and %] as delimiters -->
  Hello [%=data.name%]. 
  <!-- Every template has the variable 'data' defined -->
</div>
```

And a little jQuery code that attachs to events and messages from the backend

```js
$(function() {
  $("$my-myelement-element").on("message", function(message) {
    console.log(message.event, message.data);
  });
});
```

### HTML Attributes for the elements

* `data-react-on-message.`
* `data-react-on-dataupdate `. Allows an element to receive jQuery events for a dataupdate message
* `data-react-on-page`.

### Events
Every `.myelement` element triggers the following events:

You listen to them like

```js
$("#my-element").on("disconnect", function() {
  $(this).html("We cannot reach the backend now").fadeOut().fadeIn();
});
```

####Internet connectivity related events

* `offline`. Fired upon inability from the agent (browser or web view in phonegap) from detecting Internet conectivity.
* `online`. Fired upon an intent to connect to the Internet.

#### Backend connectivity related events

* `disconnect`. Fired upon a disconnection from backend.
* `reconnect`. Fired upon a successful connection to the backend.
* `reconnecting`. Fired upon an attempt to reconnect to the backend.
* `reconnect_error` Fired upon a backend reconnection attempt error.
* `reconnect_failed`. Fired when couldn’t reconnect to the backend after trying a lot of times.
* `connect`. Fired on send socket connect events

#### History API, PushState related events

`page`. Fired when the URL matches the value of element's data-react-on-page

#### State related events

`init`.

##Compatibility

**myelements.jquery** only works with browsers that support the history.pushState API.


##API

### Client API

#### Events

* `disconnect`
* `connect`
* `offline`
* `online`
* `reconnect`
* `reconnecting`
* `reconnect_error`
* `reconnect_failed`
* `page`
* `userinput`
* `userinput_failed`
* `userinput_success`
* `message`
* `dataupdate`
* `init`


### Server-side nodejs module API

#### Events



##License

MIT
