// If you're using this example outside of the examples folder, change this to:
// var Orvibo = require("node-orvibo") after running npm install --save node-orvibo
var Orvibo = require("../../index.js")
var o = new Orvibo()
var rfState = false

// Four timers for repeating messages, as UDP doesn't guarantee delivery
// These timers are cancelled once they've served their purpose
var timer1 // This timer is used for discovering devices
var timer2 = [] // This timer is used to subscribe to a device
var timer3 = [] // This timer is used to query a device
var timer4 = [] // This timer is used to toggle a socket or learn / emit IR

console.log("This example demonstrates how to use the RF switches with node-orvibo")
console.log("Before running this example, ensure that your AllOne is powered on.")
console.log("You also need to put your RF switch into learning mode. To do this, press and hold a button on the switch until you hear a short beep.")
console.log("The RF switches is capable of learning more than one code, so your existing setups in the WiWo app won't be affected")
console.log("When the AllOne has been discovered, the lights will toggle every 5 seconds until you quit this script.")

// We've listened, and now we're ready to go.
o.on("ready", function() {
  console.log("node-orvibo is ready. Searching for devices")
  timer1 = setInterval(function() { // Set up a timer to search for sockets every second until found
    o.discover()
  }, 1000)
})

// A device has been found and added to our list of devices
o.on("deviceadded", function(device) {
  console.log("Device has been found. Subscribing to device..")
  clearInterval(timer1) // Clear our first timer, as we've found at least one socket
  o.discover() // Ask around again, just in case we missed something
  timer2[device.macAddress] = setInterval(function() { // Set up a new timer for subscribing to this device. Repeat until we get confirmation of subscription
    o.subscribe(device)
  }, 1000)
})

// We've asked to subscribe (control) a device, and now we've had a response.
// Next, we will query the device for its name and such
o.on("subscribed", function(device) {
  console.log("Subscribed to device. Querying for information")
  clearInterval(timer2[device.macAddress]) // Stop the second subscribe timer for this device
  timer3[device.macAddress] = setInterval(function() { // Set up another timer, this time for querying
    o.query({
      device: device, // Query the device we just subscribed to
      table: "04" // See PROTOCOL.md for info. "04" = Device info, "03" = Timing info
    })
  }, 1000)
})

// Our device has responded to our query request.
// Every 5 seconds, toggle the state of the RF switch.
// See PROTOCOL.md for information about how the switches work
o.on("queried", function(device, table) {
  console.log("Device queried. Sending RF signals every 5 seconds.")
  clearInterval(timer3[device.macAddress]) // Stop the query timer
  setInterval(function() { // After 2 seconds, emit some RF to turn a lightswitch on
    console.log("Setting state to: " + rfState + " using RF ID: abcdef")
    o.emitRF({
      device: device,
      state: rfState,
      rfid: "abcdef"
    })
    rfState = !rfState
  }, 5000)

})

o.listen()
