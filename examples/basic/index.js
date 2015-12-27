var Orvibo = require("../../index.js")
var o = new Orvibo()

// Four timers for repeating messages.
var time1 = [] // Initial searching for devices
var time2 = [] // Subscribing to a device
var time3 = [] // Querying a device
var time4 = [] // Toggling of a socket

// A device has been added
o.on("deviceadded", function(device) {
  // Show all the devices we now have
  console.log("A device has been added:", device.type)
  // Clear our first timer, as we've found at least one socket
  clearInterval(time1)
  // Ask around again, just in case we missed something
  o.discover()

  // Set up a new timer for subscribing to this device. UDP on node.js isn't the best,
  // so we need to repeatedly send the message until we get a response.
  time2[device.macAddress] = setInterval(function() {
    o.subscribe(device)
  }, 1000)
})

// We've asked to subscribe, and now we've had a response. Next, we query
// the device for its name and such
o.on("subscribed", function(device) {
  console.log("Subscription to %s successful!", device.macAddress)
  // Stop the second subscribe timer for this device
  clearInterval(time2[device.macAddress])

  // Set up another timer, this time for querying
  time3[device.macAddress] = setInterval(function() {
    o.query({ device: device })
  }, 1000)
})

// Our socket has responded to our query request
o.on("queried", function(device) {
  console.log("A device has been queried. Name (if set): %s", device.name)
  // Stop the timer for this device
  clearInterval(time3[device.macAddress])

  // If this is a socket
  if(device.type == "Socket") {
    // Set up another timer that toggles the state of the unit every 5 seconds
    time4[device.macAddress] = setInterval(function() {
      o.setState({device: device, state: !device.state})
    }, 5000)
  }
})

// We've received an IR code back after placing our AllOne in learning mode.
o.on("ircode", function(device, ir) {
  // We wait 2 seconds, then repeat the code we received
  setTimeout(function() {
    o.emitIR({device: device, ir: ir})
  }, 2000)
})

// We've set the state of our socket.
o.on("setstate", function(state) {
  console.log("State of %s set to", device, state)
})

// The AllOne has a button on top of it. A short press will
// generate this event. Useful for things like a "TV on & dim the lights" thing
o.on("buttonpress", function(device) {
  console.log("The button on %s was pressed", device.name)
  // In this case, after 2 seconds, emit some RF to turn a lightswitch on
  setTimeout(function() {
  o.emitRF({device: device, state: true, rfid: "22a3d4"})
}, 2000)

})

// Bind sockets and such. When done,
o.listen(function() {
  // Set up a timer to search for sockets every second until found
  time1 = setInterval(function() {
    o.discover()
  }, 1000)
})
