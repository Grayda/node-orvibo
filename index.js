var debug = require("debug")("Orvibo")
  // args-js lets us do optional parameters and such
var Args = require("args-js")
  // For working with IP addresses
var ip = require("ip")
  // Lodash, for string padding and object-getting
var _ = require("lodash");
// Validator for ensuring stuff is as it should be
var validator = require("validator")
  // jonah takes care of hex -> ASCII and ASCII -> hex stuff
var hex = require("jonah")
  // Used when setting up a new socket. We need to sleep to let our packet send.
var sleep = require('sleep');
// For parsing timing related stuff
var moment = require("moment")

// For inheriting the EventEmitter class so we can emit events
var util = require("util")
var EventEmitter = require("events").EventEmitter
util.inherits(Orvibo, EventEmitter)

// The UDP stuff
var dgram = require('dgram');
var socket = dgram.createSocket('udp4') // For sending data
var kepler = dgram.createSocket('udp4') // For sending data to the Kepler
var setup = dgram.createSocket('udp4') // For sending data to the Kepler

function Orvibo() {
  EventEmitter.call(this);

  process.nextTick(function() { // Next time we're processing stuff.
    // If we've got a message
    socket.on("message", function(message, address) {
      // If it's from us, we're not interested
      if (ip.address() == address.address) {
        return
      }

      // Take our message, turn it into a hex string
      message = new Buffer(message).toString('hex')
      debug("Message received", message, address)
      this.emit("message", message, address) // Pass the message off to our handleMessage function
      this.handleMessage(message, address)

    }.bind(this))

    kepler.on("message", function(message, address) {
      // If it's from us, we're not interested
      if (ip.address() == address.address) {
        return
      }

      // Take our message, turn it into a hex string
      message = new Buffer(message).toString('hex')
      debug("Message received for Kepler", message, address)
        // Pass the message off to our handleMessage function
      this.emit("keplermessage", message, address) // Pass the message off to our handleMessage function
      this.emit("message", message, address) // Pass the message off to our handleMessage function
      this.handleMessage(message, address)
    }.bind(this))

  }.bind(this))
}

// Listens on options.port (defined at the bottom, for code cleanliness)
Orvibo.prototype.listen = function(callback) {
  try {
    debug("Preparing connection and listening")
    socket.bind(options.port, function() {
      debug("Socket bound to port", options.port)
      socket.setBroadcast(true)
      debug("Broadcast set to true")
    })

    kepler.bind(options.keplerport, function() {
      debug("Socket bound to port", options.keplerport)
      kepler.setBroadcast(true)
      debug("Broadcast set to true")
    })

    setup.bind(options.setupport, function() {
      debug("Socket bound to port", options.setupport)
      setup.setBroadcast(true)
      debug("Broadcast set to true")
    })
    this.emit("ready", options.port)
    if (typeof callback !== "undefined") {
      callback(options.port, options.keplerport, options.setupport)
    }
  } catch (ex) {
    throw ex
  }
}

// discover() sends out a broadcast message to find all available devices.
// If a `device` is provided, will look for that one, otherwise, will try to find all
Orvibo.prototype.discover = function(device, callback) {
  // args-js handles optional and required arguments, along with default values.
  // We use it here to determine if we need to append a MAC address to the discover packet
  var args = Args([{
    device: Args.OBJECT | Args.Optional,
    _default: {
      macAddress: "",
      macPadding: ""
    }
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  // prepareMessage is a helper function that puts together various info into
  // a ready-to-send packet. See the function definition further down for specifics
  message = this.prepareMessage({
    commandID: "7161",
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
  })

  debug("Discovery packet sent")
    // Tell any listeners that we've sent a discovery message
  this.emit("discoverysent", args.device)
  this.sendMessage(message, options.broadcastIP)

  if (typeof args.callback !== "undefined") {
    args.callback(args.device)
  }
}

// In order to control a device, you need to subscribe to it.
// If no 'device' is passed, loops through all devices and subscribes
Orvibo.prototype.subscribe = function(device, callback) {
  var args = Args([{
    device: Args.OBJECT | Args.Optional,
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (typeof args.device === "undefined") {
    debug("Subscribing to all devices")
    this.devices.forEach(function(item) {
      this.subscribe(item)
    }.bind(this))
  } else {
    debug("Subscribing to", device.macAddress)
      // prepareMessage is used a little differently here.
      // anything within "data" is flattened into a single string (so order matters!)
      // "macReversed" could be called "jslkdf" -- it doesn't matter in the end
    message = this.prepareMessage({
      commandID: "636c",
      macAddress: args.device.macAddress,
      macPadding: args.device.macPadding,
      data: {
        // This takes a MAC address, splits it up into chunks of 2 (so [A, C], [C, F] etc.)
        // then reverses the chunks (so it becomes [C, F], [A, C]), flattens the array,
        // then finally joins it together as one long string. Phew!
        macReversed: this.switchEndian(args.device.macAddress),
        macPadding: args.device.macPadding
      }
    })

    this.sendMessage(message, device.ip)
  }

  if (typeof args.callback !== "undefined") {
    args.callback(args.device)
  }
}

// Once you've subscribed to a device, you can query it for info.
// Amongst the returned data is the name, the remote password (?),
// The icon index that it shown in the WiWo app, plus heaps more
Orvibo.prototype.query = function(device, table, callback) {
  var args = Args([{
    device: Args.OBJECT | Args.Optional
  }, {
    table: Args.STRING | Args.Optional,
    _default: "04"
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (typeof args.device === "undefined") {
    debug("Subscribing to all devices")
    this.devices.forEach(function(item) {
      this.query(item)
    }.bind(this))
  } else {
    message = this.prepareMessage({
      commandID: "7274",
      macAddress: args.device.macAddress,
      macPadding: args.device.macPadding,
      data: {
        blank: "00000000",
        // There are two tables we're interested in,
        // Table 04 is neat info about the device, Table 03
        // is timing data (e.g. turn socket on at 8pm etc.)
        table: args.table,
        blank2: "000000000000"
      }
    })
    this.sendMessage(message, args.device.ip)
  }
  if (typeof args.callback !== "undefined") {
    args.callback(args.device, args.table)
  }
}

// setState turns a socket on or off.
Orvibo.prototype.setState = function(device, state, callback) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    state: Args.BOOL | Args.Required
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (args.device.type != "Socket") {
    return
  }

  // Sets our device's state property to our new value.
  args.device.state = args.state

  message = this.prepareMessage({
    commandID: "6463",
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    data: {
      // Session ID?
      blank: "00000000",
      // Ternary operators are cool, but hard to read.
      // This one says "if state is true, set state to 01, otherwise, set to 00"
      state: args.state ? "01" : "00"
    }
  })

  // This is a misnomer. addDevice also updates devices if they exist
  this.addDevice(args.device)

  this.emit("setstate", args.device, args.state)
  this.sendMessage(message, args.device.ip)
  if (typeof args.callback !== "undefined") {
    args.callback(args.device, args.state)
  }
}

// emitIR does what it says on the tin. Sends out an IR code from the AllOne
// This works best if you grab the code from "enterLearningMode" and play it back
Orvibo.prototype.emitIR = function(device, ir, callback) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    ir: Args.STRING | Args.Required
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (args.device.type != "AllOne") {
    return
  }

  message = this.prepareMessage({
    commandID: "6963",
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    data: {
      extra: "65000000",
      // The AllOne flat out refuses to emit IR if these two bytes are the same
      // as the last time IR was emitted. It's to prevent UDP-related double-blasting
      randomA: _.padLeft(Math.floor((Math.random() * 255)).toString(16), 2, "0"),
      randomB: _.padLeft(Math.floor((Math.random() * 255)).toString(16), 2, "0"),
      // HA HA, OH WOW! This is a doozy. It takes the length of our IR (divided by 2, because bytes)
      // turns it into a hex string, then uses lodash's "padLeft" to add leading zeroes if necessary. It then splits the string into chunks of two
      // (like our subscribe() function) before reversing the chunks, flattening any nested arrays, then joins the lot into a single string. UGH!
      irlength: this.switchEndian(_.padLeft((args.ir.length / 2).toString(16).toUpperCase(), 4, "0")),
      ir: args.ir
    }
  })
  this.emit("iremitted", args.device, args.ir)
  this.sendMessage(message, args.device.ip)
  if (typeof args.callback !== "undefined") {
    args.callback(args.device, args.ir)
  }
}

// Emits RF from the AllOne. Can only be used with the Orvibo RF switch, due to the way the RF stuff is done.
// sessionID is usually obtained from Android / iOS and isn't strictly necessary (and may even default to all zeroes in some cases)
// state is whether you're turning the RF switch on or off. rfkey is a way to uniquely identify what switch you're turning on.
// The rfkey usually starts at around 41 (29 in hex) but can be anything up to 65535 (FFFF in hex). RFID seems to be generated from
// Android / iOS and not from the AllOne, as my "barely works" Orvibo emulator has no RFID hard-coded, and the reported RFID has changed after
// deleting / re-adding the fake AllOne to the WiWo app
// NOTE: There is NO way to determine the state of a switch, as 433mhz is stateless, so it's up to you to track the state!
Orvibo.prototype.emitRF = function(device, sessionID, state, rfkey, rfid, callback) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    sessionID: Args.STRING | Args.Optional,
    _default: "00000000"
  }, {
    state: Args.BOOL | Args.Required
  }, {
    rfkey: Args.STRING | Args.Optional,
    _default: "2a00"
  }, {
    rfid: Args.STRING | Args.Required
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  message = this.prepareMessage({
    commandID: "6463",
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    data: {
      sessionID: args.sessionID,
      randomA: _.padLeft(Math.floor((Math.random() * 255)).toString(16), 2, "0"),
      randomB: _.padLeft(Math.floor((Math.random() * 255)).toString(16), 2, "0"),
      state: args.state ? "01" : "00",
      rfkey: args.rfkey,
      rfid: args.rfid
    }
  })
  this.sendMessage(message, args.device.ip)
  this.emit("rfemitted", args.device, args.sessionID, args.state, args.rfkey, args.rfid)
  if (typeof args.callback !== "undefined") {
    args.callback(args.device, args.sessionID, args.state, args.rfkey, args.rfid)
  }
}

// enterLearningMode does what it says on the tin. It makes the AllOne's ring turn red and waits for an IR signal
// when a signal is found, we can extract the IR code it learned from there.
// Same as some of the other functions: if no device passed, loops through all devices and enters them into learning mode
Orvibo.prototype.enterLearningMode = function(device) {
  var args = Args([{
    device: Args.OBJECT | Args.Optional
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (typeof args.device === "undefined") {
    debug("Putting all AllOnes into learning mode")
    this.devices.forEach(function(item) {
      if (item.type != "AllOne") {
        return
      }
      this.enterLearningMode(item)
    }.bind(this))
  } else {
    if (args.device.type != "AllOne") {
      return
    }
    message = this.prepareMessage({
      commandID: "6c73",
      macAddress: args.device.macAddress,
      macPadding: args.device.macPadding,
      data: {
        // Not sure what this data is for. I don't know what half of the data does, frankly!
        other: "010000000000"
      }
    })
    this.sendMessage(message, args.device.ip)
    this.emit("learningmode", device)
    if (typeof args.callback !== "undefined") {
      args.callback(device)
    }
  }
}

// This sets up a device while it's in AP mode. This is FAR more
// reliable than setting up the other way (which worked maybe once out of 30 tries.
// Props to Andrius Štikonas (https://stikonas.eu/wordpress/2015/02/24/reverse-engineering-orvibo-s20-socket/)
// for reading up on the HF WiFi chip and getting this working.
Orvibo.prototype.setupDeviceAP = function(type, encryption, ssid, password) {
  var args = Args([{
    type: Args.STRING | Args.Required,
    _check: /(OPEN|SHARED|WPAPSK|WPA2PSK)/
  }, {
    encryption: Args.STRING | Args.Required,
    _check: /(NONE|WEP-H|WEP-A|TKIP|AES)/
  }, {
    ssid: Args.STRING | Args.Required,
    _check: function(ssid) {
      return ssid.length <= 32
    }
  }, {
    password: Args.STRING | Args.Optional,
    _default: "",
    _check: function(password) {
      return password.length <= 64
    }
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  setup.on("message", function(message, address) {
    // If it's from us, we're not interested
    if (ip.address() == address.address) {
      return
    }

    // Take our message, turn it into a hex string
    message = new Buffer(message).toString('hex')
    debug("Message received for socket setup", message, address)

    if (message.indexOf("2b6f6b") > -1) {
      debug("Got +ok from device")
      options.setupStep++
        switch (options.setupStep) {
          case 1:
            debug("First +ok. Sending WiFi details")
            this.sendMessage({
              message: new Buffer("AT+WSKEY=" + args.type + "," + args.encryption + "," + args.password + "\r").toString('hex'),
              address: options.broadcastIP,
              port: options.setupport,
              sock: setup
            })
            break
          case 2:
            debug("Second +ok. Switching to station mode")
            this.sendMessage({
              message: new Buffer("AT+WMODE=STA\r").toString('hex'),
              address: options.broadcastIP,
              port: options.setupport,
              sock: setup
            })
            break
          case 3:
            debug("Third +ok. Rebooting")
            this.sendMessage({
              message: new Buffer("AT+Z\r").toString('hex'),
              address: options.broadcastIP,
              port: options.setupport,
              sock: setup
            })
            this.emit("setupcomplete")
            if (typeof args.callback !== "undefined") {
              args.callback(args.type, args.encryption, args.ssid)
            }
        }
    } else if (message.indexOf("4143434632") > -1) {
      debug("Device now in setup mode. Sending SSID")
      this.sendMessage({
        message: new Buffer("+ok").toString('hex'),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      this.sendMessage({
        message: new Buffer("AT+WSSSID=" + args.ssid + "\r").toString('hex'),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })

    } else if (message.indexOf("2b455252") > -1) {
      debug("ERROR!!")

    }
    this.emit("message", message, address) // Pass the message off to our handleMessage function
    this.emit("setupmessage", message, address) // Pass the message off to our handleMessage function
  }.bind(this))

  debug("Putting device in serial mode")
  options.setupStep = 0
  this.sendMessage({
    message: new Buffer("HF-A11ASSISTHREAD").toString('hex'),
    address: options.broadcastIP,
    port: options.setupport,
    sock: setup
  })

}

// More info here: http://blog.slange.co.uk/orvibo-s20-wifi-power-socket/
// The WiFi chip inside can "sniff" network traffic, and it does so to look for
// a specific pattern. Basically you spell out the password with the length of your UDP
// packet. So to send a "p", you'd broadcast a packet of length 230 (so that's 112 is ASCII,
// plus 76 for some reason, plus 42 (UDP header) and that packet contains nothing but 0x05's)
// After repeating that for a minute, the device should be (almost) ready to use on the network.
Orvibo.prototype.setupDevice = function(password) {
  var args = Args([{
    password: Args.STRING | Args.Required
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  var sleepTime = 15000
  debug("Setting up device with password: %s", args.password[0] + _.repeat("*", args.password.length - 2) + args.password[args.password.length - 1])

  // First part of the pattern is to send 0x05 200 times with a TOTAL length of 118
  for (var i = 0; i < 400; i++) {
    this.sendMessage({
      message: _.repeat("05", 76),
      address: options.broadcastIP,
      port: options.setupport,
      sock: setup
    })
    sleep.usleep(sleepTime)
  }
  debug("Sending of initial header complete")
  repeat = setInterval(function() {

    for (var i = 0; i < 6; i++) {
      this.sendMessage({
        message: _.repeat("05", 89),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      sleep.usleep(sleepTime)
    }

    debug("Sending of header complete")

    for (var i = 0; i <= args.password.length - 1; i++) {
      debug("Sending %d (%s)", args.password.charCodeAt(i), args.password[i])
      this.sendMessage({
        message: _.repeat("05", args.password.charCodeAt(i) + 76),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      sleep.usleep(sleepTime)
      this.sendMessage({
        message: _.repeat("05", args.password.charCodeAt(i) + 76),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      sleep.usleep(sleepTime)
    }

    debug("Sending of password complete")

    for (var i = 0; i < 6; i++) {
      this.sendMessage({
        message: _.repeat("05", 86),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      sleep.usleep(sleepTime)
    }

    debug("Sending of footer complete")

    for (var i = 0; i < 6; i++) {
      this.sendMessage({
        message: _.repeat("05", 332 + password.length),
        address: options.broadcastIP,
        port: options.setupport,
        sock: setup
      })
      sleep.usleep(sleepTime)
    }

    debug("Sending of checksum complete. Now repeating..")


  }.bind(this), 100)

  // Cancel our timer after 60 seconds
  setTimeout(function() {
    this.emit("setuphalted")

    debug("60 seconds has elapsed. Timer stopped.")
    clearInterval(repeat)
    if (typeof args.callback !== "undefined") {
      args.callback()
    }
  }.bind(this), 60000)


}

Orvibo.prototype.addTimer = function(device, date, index, state, update, repeat) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    date: Args.DATE | Args.Required
  }, {
    index: Args.INT | Args.Optional,
    _default: -1
  }, {
    state: Args.BOOLEAN | Args.Optional, // Should this be required instead? What about AllOne?
    _default: false
  }, {
    update: Args.BOOLEAN | Args.Optional, // Should this be required instead? What about AllOne?
    _default: false
  }, {
    repeat: Args.STRING | Args.Optional,
    _default: "ff"
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  if (args.index == -1) {
    args.index = args.device.timers.length + 1
  }

  args.date = moment(args.date)

  if (args.device.type == "Socket") {
    message = this.prepareMessage({
      macAddress: args.device.macAddress,
      macPadding: args.device.macPadding,
      commandID: "746d",
      data: {
        blank: "00000000",
        table: "03",
        command: args.update ? "0001" : "0000", // 0000 = Create, 0001 = Update, 0002 = Delete
        unknown: "1c00",
        index: this.switchEndian(_.padLeft(args.index, 4, "0")),
        name: "6e756c6c202020202020202020202020", // null + padding. For an AllOne, I suspect this would be the name of an IR command or something?
        state: args.state ? "0100" : "0000",
        year: this.switchEndian(_.padLeft(args.date.year().toString(16), 4, "0")),
        month: this.switchEndian(_.padLeft((args.date.month() + 1).toString(16), 2, "0")),
        day: this.switchEndian(_.padLeft((args.date.day() + 1).toString(16), 2, "0")),
        hour: this.switchEndian(_.padLeft((args.date.hour() + 1).toString(16), 2, "0")),
        minute: this.switchEndian(_.padLeft((args.date.minute() + 1).toString(16), 2, "0")),
        second: this.switchEndian(_.padLeft((args.date.second() + 1).toString(16), 2, "0")),
        repeat: args.repeat
      }
    })

    this.sendMessage(message, args.device.ip)
  } else {
    debug("NOT SOCKET")
  }
}

Orvibo.prototype.updateTimer = function(device, date, index, state, repeat) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    date: Args.DATE | Args.Required
  }, {
    index: Args.INT | Args.Optional,
    _default: -1
  }, {
    state: Args.BOOLEAN | Args.Optional, // Should this be required instead? What about AllOne?
    _default: false
  }, {
    repeat: Args.STRING | Args.Optional,
    _default: "ff"
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  this.addTimer({
    device: args.device,
    date: args.date,
    index: args.index,
    state: args.state,
    update: true,
    repeat: args.repeat,
  })
}


Orvibo.prototype.deleteTimer = function(device, index) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    index: Args.INT | Args.Optional,
    _default: -1
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  this.prepareMessage({
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    commandID: "746d",
    data: {
      extra: "0000000003",
      command: "0002",
      index: this.switchEndian(_.padLeft(args.index, 4, "0")),
    }
  })
  this.sendMessage(message, args.device.ip)
}

// This works.. in theory. In reality, my AllOne and sockets, with the default password of 888888, aren't
// updated. The command simply times out. Either the command sent by WiWo / this app is incorrect
// or there is a bug with the device firmware that means the password change packet is never processed.
// You might want to try the command to modify tables, and simply write a new 0100 record with the new password.
// That theory hasn't been tested yet. Perhaps in a future version :)
Orvibo.prototype.modifyRemotePassword = function(device, oldpassword, newpassword) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    oldpassword: Args.STRING | Args.Optional,
    _check: function(ssid) {
      return ssid.length <= 12
    },
    _default: "888888"
  }, {
    newpassword: Args.STRING | Args.Optional,
    _default: "",
    _check: function(password) {
      return password.length <= 12
    }
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  message = this.prepareMessage({
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    commandID: "6d70",
    data: {
      unknown: "78ed40",
      recordlength: "0c",
      oldpassword: hex.hex(_.padRight(args.oldpassword, 12, " ")),
      newpassword: hex.hex(_.padRight(args.newpassword, 12, " "))
    }
  })

  this.sendMessage(message, args.device.ip)
}

// NOTE: This doesn't work yet. When it's done, it'll let you rename
// a device, change the icon and other stuff. You basically send it an
// entire Table 04 and it overwrites it on the device.
// This is in contrast to Table 03 (A.K.A the timer function)
// where you send one timer to add, update or delete. 
Orvibo.prototype.updateDevice = function(device, table, data) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }, {
    table: Args.STRING | Args.Optional,
    _default: "04"
  }, {
    data: Args.STRING | Args.Required,
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  // 00000000 04 00018a0001004325accfdeadbeef202020202020efbeaddecfac202020202020383838383838202020202020446561646c7920426565662020202020040010000000090000000500000010272a796fd01027766963656e7465722e6f727669626f2e636f6d20202020202020202020202020202020202020202019001600002c0a80101ffffff000100000a00000
  this.prepareMessage({
    macAddress: args.device.macAddress,
    macPadding: args.device.macPadding,
    commandID: "746d",
    blank: "00000000",
    table: args.table || "04"
  })
}

// This function takes a bunch of info and makes it into a message, ready to send via sendMessage().
// It calculates message length, puts stuff in the right order and all that jazz, so you don't have to.
// commandID is what command to send (e.g. "6c73" = enter learning mode), macAddress and macPadding are
// pretty self-explanatory. data is an object, and is for stuff that isn't present in all messages
// (e.g. IR data). prepareMessage() goes through all `data`'s properties', IN THE EXACT ORDER YOU PUT IT IN,
// and merges it all into a single string. The property names within `data` are just for show.
Orvibo.prototype.prepareMessage = function(commandID, macAddress, macPadding, data, callback) {
  var args = Args([{
    commandID: Args.STRING | Args.Required
  }, {
    macAddress: Args.STRING | Args.Optional,
    _default: ""
  }, {
    macPadding: Args.STRING | Args.Optional,
    _default: options.macPadding
  }, {
    data: Args.OBJECT | Args.Optional,
    _default: {}
  }, {
    callback: Args.FUNCTION | Args.Optional
  }], arguments);

  var packet, len
  var dataStr = ""

  // Go through all of data's properties and merges the values into a single string
  for (key in args.data) {
    dataStr += args.data[key]
  }

  // We need to define packet twice, because we can't determine the length of the string as we're building it.
  // So we build the string, count the length, then redefine the string, with the length we stored earlier.
  packet = options.magicWord + "0000" + args.commandID + args.macAddress + args.macPadding + dataStr
  packet = options.magicWord + _.padLeft((packet.length / 2).toString(16).toLowerCase(), 4, "0") + args.commandID + args.macAddress + args.macPadding + dataStr

  if (typeof args.callback !== "undefined") {
    args.callback(message)
  }
  return packet
}

// Here's where the fun happens. This takes a message from our socket, parses it and
// does stuff with that message. This can get fairly long, so don't get lost!
Orvibo.prototype.handleMessage = function(message, address, sock) {
  debug("Parsing incoming message. Command ID is:", message.substr(8, 4))
    // Get our commandID
  switch (message.substr(8, 4)) {
    // 7161 = A device has responded to our discovery call!
    case "7161":
      // If we don't have this device in our list
      if (!_.has(this.devices, message.substr(14, 12))) {
        // Find out what type of device it is
        switch (message.substr(62, 6)) {
          // SOC = Socket
          case "534f43":
            debug("Found socket!")
            var device = {
              macAddress: message.substr(14, 12),
              macPadding: message.substr(26, 12),
              type: "Socket",
              ip: address.address,
              // Takes the last character from the message and turns it into a boolean.
              // This is our socket's initial state
              state: validator.toBoolean(message.substr(message.length - 1, 1)),
              // Give it a generic name until we discover the real name
              name: "Socket " + message.substr(14, 12),
              timers: []
            }
            this.emit("socketfound", device)
            this.addDevice(device)
            break
            // IRD = AllOne
          case "495244":
            var device = {
              macAddress: message.substr(14, 12),
              macPadding: message.substr(26, 12),
              type: "AllOne",
              ip: address.address,
              name: "AllOne " + message.substr(14, 12),
              timers: []
            }
            this.emit("allonefound", device)
            this.addDevice(device)
            break
            // RFG = Kepler (I think)
          case "4B4550":
            var device = {
              macAddress: message.substr(14, 12),
              macPadding: message.substr(26, 12),
              type: "Kepler",
              ip: address.address,
              name: "Kepler " + message.substr(14, 12)
            }
            this.emit("keplerfound", device)
            this.addDevice(device)
            break
            // We got nothing. Let 'em know.
          default:
            this.emit("unknownfound", message.substr(62, 6))
            debug("Found something else:", message.substr(62, 6))
            break
        }

      }
      break
      // A device has confirmed our subscription
    case "636c":
      device = this.getDevice(message.substr(12, 12))
      debug("Subscription confirmation returned from", device.macAddress)
      this.emit("subscribed", device)
      break
      // We've queried a device and got a response
    case "7274":
      device = this.getDevice(message.substr(12, 12))
        // This is our table number which determines what data we got back
      switch (message.substr(46, 2)) {
        // Table 04 = General info about the device
        case "04":

          debug("Query data returned from", device.macAddress)
          device.password = hex.ascii(message.substr(116, 24)).trim()

          if (!hex.ascii(message.substr(140, 32)).trim() == "ffffffffffffffffffffffffffffffff") {
            device.name = hex.ascii(message.substr(140, 32)).trim() || device.name
          }

          device.icon = this.hexToInt(message.substr(172, 4))
          device.hardwareversion = this.hexToInt(message.substr(176,8))
          device.firmwareversion = this.hexToInt(message.substr(184,8))
          device.cc3000firmareversion = this.hexToInt(message.substr(192,8))

          device.remote = {
            password: hex.ascii(message.substr(116, 24)).trim(),
            serverport: this.hexToInt(message.substr(200, 4)),
            serverip: this.hexToInt(message.substr(204, 2)) + "." + this.hexToInt(message.substr(206, 2)) + "." + this.hexToInt(message.substr(208, 2)) + "." + this.hexToInt(message.substr(210, 2)),
            domainport: this.hexToInt(message.substr(212, 4)),
            domainserver: hex.ascii(message.substr(216,80)).toString().trim()
          }

          device.dhcpmode = validator.toBoolean(message.substr(321,1))
          device.discoverable = validator.toBoolean(message.substr(323,1))
          device.timezoneset = validator.toBoolean(message.substr(325,1))
          device.timezone = this.hexToInt(message.substr(326,2))

          setTimeout(function() {
            this.emit("countdownended", device)
          }.bind(this), this.hexToInt(message.substr(330, 4)))
            // device.hardwareversion = hex.ascii(message.substr(176,2))
            // device.softwareversion = hex.ascii(message.substr(184,2))
          this.emit("queried", device, message.substr(46, 2))
          this.addDevice(device)
          break
          // Table 03 is timing data (e.g. what schedules are set up etc.)
        case "03":

          device.timers = []
          var arr = this.extractRecords(message.substr(56))
          arr.forEach(function(item) {

            time = {
              id: this.hexToInt(item.substr(0, 4)),
              state: validator.toBoolean(item.substr(37, 1)),
              date: moment({
                year: this.hexToInt(item.substr(40, 4)),
                month: this.hexToInt(item.substr(44, 2)) - 1,
                day: this.hexToInt(item.substr(46, 2)) - 1,
                hour: this.hexToInt(item.substr(48, 2)) - 1,
                minute: this.hexToInt(item.substr(50, 2)) - 1,
                second: this.hexToInt(item.substr(52, 2)) - 1,
              }),
              repeat: this.hexToInt(item.substr(54, 2)),
            }
            device.timers.push(time)

          }.bind(this))
          this.emit("queried", device, message.substr(46, 2))
          this.addDevice(device)
          break
      }
      break
      // Someone has pressed a button on the socket, changing it's state
    case "7366":
      device = this.getDevice(message.substr(12, 12))
        // Extract our state (which is the last byte) and booleanify it
      device.state = validator.toBoolean(message.substr(message.length - 1, 1))
      debug("State change confirmation received. New state is", device.state)
        // Update our device list
      this.addDevice(device)
      this.emit("externalstatechanged", device, device.state)
      break
      // We've asked to change the state, and the socket has done so.
    case "6463":
      device = this.getDevice(message.substr(12, 12))
      debug("State change confirmation received for", device.macAddress)
      break
      // The top of the AllOne has a button that is a wakeup / factory reset button.
      // As long as you press (and not hold) the button, you get this message back
    case "6469":
      device = this.getDevice(message.substr(12, 12))
      debug("Reset button pressed on AllOne", device.macAddress)
      this.emit("buttonpress", device)
      break
      // We've entered learning mode and fed the AllOne some juicy, juicy IR data
      // This message contains the IR code it learned
    case "6c73":
      device = this.getDevice(message.substr(12, 12))
      debug("IR received. Length was", message.substr(52).length)
      this.emit("ircode", device, message.substr(52))
      break
      // We've asked to emit some IR, and it's done it.
    case "6963":
      device = this.getDevice(message.substr(12, 12))
      this.emit("irsent", device)
      break
    case "746d":
      console.dir("!!!!!!!!!!", message)
      break
    // We've asked to change the remote password, and we've had a message back.
    case "6d70":
      device = this.getDevice(message.substr(12, 12))
      this.emit("passwordchanged", device)
  }

}

// The heart of our code. This sends the message via UDP. Pass it a hex string and an address
Orvibo.prototype.sendMessage = function(message, address, port, sock, callback) {
  var args = Args([{
    message: Args.STRING | Args.Required
  }, {
    address: Args.STRING | Args.Required
  }, {
    sock: Args.OBJECT | Args.Optional,
    _default: socket
  }, {
    port: Args.INT | Args.Optional,
    _default: options.port
  }], arguments);

  args.message = new Buffer(args.message.toLowerCase(), "hex"); // We need to send as a buffer. this line takes our message and makes it into one.
  args.sock.send(args.message, 0, args.message.length, args.port, args.address, function(err, bytes) { // Send the message. Parameter 2 is offset, so it's 0.
    if (err) throw err; // Error? CRASH AND BURN BB!
    debug("Message sent to %s:%s with length %d", args.address, args.port, args.message.length)
    this.emit("messageSent", args.message, args.address, args.sock.address().address, args.sock); // Tell the world we've sent a packet. Include message, who it's being sent to, plus the address it's being sent from
  }.bind(this)); // Again, we do .bind(this) so calling this.emit(); comes from OrviboAllOne, and not from scktClient
  if (typeof callback !== "undefined") {
    args.callback(message, address, port)
  }
}

// Adds (or updates) a device in our list.
Orvibo.prototype.addDevice = function(device) {
  var args = Args([{
    device: Args.OBJECT | Args.Required
  }], arguments);

  // If the device we're trying to add exists in our database
  if (_.where(this.devices, {
      macAddress: args.device.macAddress
    }).length > 0) {
    // If that existing object is exactly the same as the device we're passing it
    if (_.isEqual(args.device, _.where(this.devices, {
        macAddress: args.device.macAddress
      }))) {
      // Don't do anything else
      return
    }

    // Get our device from the list
    dev = _.where(this.devices, {
        macAddress: args.device.macAddress
      })
      // Override the device in the list with the one we passed it
    dev = args.device
    this.emit("deviceupdated", args.device)
      // If the device isn't in the list
  } else {
    // Push it onto our array of devices
    this.devices.push(args.device)
    this.emit("deviceadded", args.device)
  }

  if (typeof callback !== "undefined") {
    args.callback(args.device)
  }

}

// This function takes some data (e.g. timing data obtained after querying table 03) and
// loops through it. It takes the first `lengthcount` bytes and turns them into an integer.
// That many bytes are substr'd from `data` and pushed to an array, and `data` is then modified
// to remove the bytes we just extracted. The process loops again, until no data is left,
// OR the number of bytes we're supposed to extract is greater than the length of the data remaining.
Orvibo.prototype.extractRecords = function(data, lengthcount, littleendian) {
  var args = Args([{
    data: Args.STRING | Args.Required
  }, {
    lengthcount: Args.INT | Args.Optional,
    _default: 2
  }, {
    littleendian: Args.BOOLEAN | Args.Optional,
    _default: true
  }], arguments);

  var res = []
  debug("Extracting records from %s", data)
    // Only interested in looping while we have data
  while (args.data != "") {
    debug("Data left: %s", data)
    if (args.littleendian) {
      num = parseInt(_.flatten(_.chunk(args.data.substr(0, args.lengthcount * 2), 2).reverse()).join(""), 16) * 2
    } else {
      num = parseInt(args.data.substr(0, args.lengthcount * 2), 16) * 2
    }
    // Get the first two bytes and make it into a number. Spin it all around because these numbers are little endian

    // If the number of bytes to get (factoring in 2 bytes for the length) is less than our remaining data,
    if (num + args.lengthcount * 2 <= args.data.length) {
      debug("Pushing %s to the array", args.data.substr(args.lengthcount * 2, num))
        // Shove it onto our array
      res.push(args.data.substr(args.lengthcount * 2, num))
        // And reset `data` to be the data, less our already-extracted record
      args.data = args.data.substr(num + args.lengthcount * 2)
    } else {
      // If we've got more bytes to grab than there is available, stop
      args.data = ""
    }
  }
  // Return what we've got.
  debug("Extracted %d records", res.length)
  return res
}

Orvibo.prototype.switchEndian = function(data) {
  var args = Args([{
    data: Args.STRING | Args.Required
  }], arguments);

  return _.flatten(_.chunk(args.data, 2).reverse()).join("")
}

Orvibo.prototype.hexToInt = function(data, switchendian) {
  var args = Args([{
    data: Args.STRING | Args.Required
  }, {
    switchendian: Args.BOOLEAN | Args.Optional,
    _default: true
  }], arguments);

  if (args.switchendian) {
    args.data = this.switchEndian({
      data: args.data
    })
  }

  return parseInt(args.data, 16)
}

// Returns a device, given a MAC address
Orvibo.prototype.getDevice = function(macAddress, callback) {
  var args = Args([{
    macAddress: Args.STRING | Args.Required
  }], arguments);

  var device = _.where(this.devices, {
    macAddress: args.macAddress
  })[0]

  if (typeof callback !== "undefined") {
    args.callback(device)
  }
  return device
}

// Prepare our devices array for filling
Orvibo.prototype.devices = []

// Some generic options
var options = {
  port: 10000,
  keplerport: 9999,
  setupport: 48899, // What port we'll use to set up new sockets
  broadcastIP: "255.255.255.255",
  macPadding: "202020202020",
  magicWord: "6864",
  setupStep: 0 // Used to work out what command to send next when setting up a new socket
}


module.exports = Orvibo
