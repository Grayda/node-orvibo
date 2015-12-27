// This demo shows you how to set up a new Orvibo device.
// To do it, put your device in "AP mode". You can do this by
// holding down the reset button on your device until the light
// flashes red, then holding down the button again until it
// starts blinking blue. When it's in AP mode, a new wireless
// network will appear. Connect to it, then run this script.
var Orvibo = require("../../index.js")
var o = new Orvibo()

console.log()
console.log("Please check the README.md if this example appears to do nothing!")

o.listen()

// Method 1 of setup. Try this first. If it doesn't work (which is very likely), then try method 2
// o.setupDevice("password123")

// Method 2. Uses serial commands to connect
o.setupDeviceAP({
  type: "WPA2PSK", // OPEN, SHARED, WPAPSK, WPA2PSK
  encryption: "AES", // NONE, WEP-H, WEP-A, TKIP, AES
  ssid: "mynetwork",
  password: "password123"
})
