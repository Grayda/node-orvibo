// This is some sample code that shows how to construct a packet for the newer Orvibo items.
console.log()
console.log("Orvibo PK Packet Creator")
console.log("========================")
console.log()

var crypto = require("crypto")
var crc = require("buffer-crc32")
var _ = require("lodash")

if(process.argv.length == 5) {
  key = process.argv[2]
  protocolType = process.argv[3]
  json = process.argv[4]
} else {
  console.log("Wrong number of parameters! Expecting 3, got " + process.argv.length - 2)
  process.exit(1)
}

if(key == "") {
  console.log("===================================================================================")
  console.log("ERROR! No decryption key specified!")
  console.log("Usage: " + process.argv[1] + " <key> <protocol type (pk or dk)> <json to encrypt>")
  console.log("===================================================================================")
  process.exit(1)
}

cipher = crypto.createCipheriv('AES-128-ECB', process.argv[2], '')
cipher.setAutoPadding(true)

dec = cipher.update(json, 'utf8', 'hex')
dec += cipher.final('hex')

packet = "6864" + "0000" + (new Buffer(protocolType, 'ascii')).toString('hex') + "00000000" + _.padStart(dec, 128, "20")
packet = "6864" + _.padStart((packet.length / 2).toString(16).toLowerCase(), 4, "0") + (new Buffer(protocolType, 'ascii')).toString('hex') + crc(new Buffer(dec, 'hex')).toString('hex') + _.padStart(dec, 128, "20")

console.log("Final packet:")
console.log("=============")
console.log(packet)
