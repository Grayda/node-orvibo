var Orvibo = require("../../index.js")
var o = new Orvibo()

// Four timers for repeating messages, as UDP doesn't guarantee delivery
// These timers are cancelled once
var timer1 // This timer is used for discovering devices
var timer2 = [] // This timer is used to subscribe to a device
var timer3 = [] // This timer is used to query a device
var timer4 = [] // This timer is used to toggle a socket or learn / emit IR

// We've listened, and now we're ready to go.
o.on("ready", function() {
  console.log("Sockets bound. Searching for devices..")
  timer1 = setInterval(function() { // Set up a timer to search for sockets every second until found
    o.discover()
  }, 1000)
})

o.on("message", function(message, address) {
  console.log("Message: %s from %s", message, address)
})

// A device has been found and added to our list of devices
o.on("deviceadded", function(device) {
  console.log("Found device of type %s. Subscribing to device..", device.type)
  clearInterval(timer1) // Clear our first timer, as we've found at least one socket
  o.discover() // Ask around again, just in case we missed something
  timer2[device.macAddress] = setInterval(function() { // Set up a new timer for subscribing to this device. Repeat until we get confirmation of subscription
    o.subscribe(device)
  }, 1000)
})

// We've asked to subscribe (control) a device, and now we've had a response.
// Next, we will query the device for its name and such
o.on("subscribed", function(device) {
  console.log("Subscribed to %s. Querying the device on table 04 (general socket info)", device.macAddress)
  clearInterval(timer2[device.macAddress]) // Stop the second subscribe timer for this device
  timer3[device.macAddress] = setInterval(function() { // Set up another timer, this time for querying
    o.query({
      device: device, // Query the device we just subscribed to
      table: "04" // See PROTOCOL.md for info. "04" = Device info, "03" = Timing info
    })
  }, 1000)
})

// Our device has responded to our query request
o.on("queried", function(device, table) {
  clearInterval(timer3[device.macAddress]) // Stop the query timer
  if (device.type == "Socket") { // If this is a socket
    console.log("Socket %s queried..", device.macAddress)
    if(table == "03") {
      console.log("Retrieved %d timer(s) from socket:", device.timers.length)
      console.dir(device.timers)
      console.log()

      setTimeout(function() {
        console.log("Deleting timer with index %d", device.timers.length + 1)
        o.deleteTimer(device, device.timers.length + 1)
      }, 120000)
      return
    }
    console.log("Creating new timer on %s with current date. Index is %d and state is true", device.macAddress, device.timers.length + 1)
    console.log("!!!!! Please check your WiWo app for the newly created timer! It will be deleted in two minutes.")
    o.addTimer({
      device: device,
      date: new Date(),
      // Index is left out. The code will assign a new index
      state: true,
      // Repeat is left out. It defaults to every day (FF)
    })
    console.log("Querying %s for timing info..", device.macAddress)
    timer3[device.macAddress] = setInterval(function() { // Set up another timer, this time for querying
      o.query({
        device: device, // Query the device we just subscribed to
        table: "03" // See PROTOCOL.md for info. "03" = Timing info
      })
    }, 1000)

  }
})

o.listen()
