var aesjs = require("aes-js")
var _ = require("lodash")
var crc32 = require('buffer-crc32')

// Replace this with the key you got from the Kepler app
var key = "key_here"

console.log()
console.log("Orvibo PK Packet Decrypter")
console.log("==========================")
console.log()

// This script takes either 1 or 2 additional arguments.
// If one extra argument is present, it's just a packet
// If two are present, it's a key and packet, separated by a space
if(process.argv.length == 4) {
  key = process.argv[2]
  packet = process.argv[3]
} else if(process.argv.length == 3) {
  packet = process.argv[2]
} else {
  console.log("Wrong number of parameters! Expecting 1 or 2, got " + process.argv.length)
  process.exit(1)
}


// Split it by 2020 (there's actually more padding, but this will do)
parts = packet.split("2020")
// The part to decrypt is at the end
dec = packet.substr(20).replace(/(20)\1/g, "")

if(typeof process.argv[2] === "undefined") {
  console.log("Usage: node keplerdecode.js <packet from the Kepler, starting with 6864>")
  process.exit(1)
}

if(packet.substr(0, 4) !== "6864") {
  console.log("============================================================")
  console.log("ERROR! Magic Word (6864) not found. Is this a Kepler Packet?")
  console.log("============================================================")
  process.exit(1)
}

if((dec.length % 16) !== 0) {
  console.log("======================================================================================")
  console.log("ERROR! Length of payload to decrypt must be a multiple of 16! Is this a Kepler Packet?")
  console.log("======================================================================================")
  process.exit(1)
}

console.log("Using decryption key:")
console.log("=====================")
console.log(key)
console.log()

console.log("Input:")
console.log("======")
console.log(packet)
console.log()

console.log("Calculated Packet Length:")
console.log("=========================")
// This turns the length into a 4 byte little-endian string
console.log((packet.length / 2) + " bytes (" + _.padStart((packet.length / 2).toString(16).toLowerCase(), 4, "0") + ")")
console.log()

// This can be pk or dk. Not sure what that means just yet
console.log("Packet Type:")
console.log("============")
console.log(new Buffer(packet.substring(8,12), 'hex').toString('ascii'))
console.log()

console.log("Payload to decrypt:")
console.log("===================")
console.log(dec)
console.log()

var key = aesjs.util.convertStringToBytes(key);
var textBytes = aesjs.util.convertStringToBytes(new Buffer(dec, 'hex'));

var aesEcb = new aesjs.ModeOfOperation.ecb(key);
var decryptedBytes = aesEcb.decrypt(textBytes);
var decryptedText = aesjs.util.convertBytesToString(decryptedBytes);

console.log("CRC32 Checksum:")
console.log("===============")
console.log("Expecting:" + packet.substring(12,20))
crc = crc32(new Buffer(dec, 'hex')).toString('hex')
if(crc == packet.substring(12,20)) {
  console.log("Calculated: " + crc + " (MATCH)")
} else {
  console.log("Calculated: " + crc + " (no match)")
}
console.log()

try {
  // -1 because there's a funky byte at the end. A smiling face or something?
  obj = JSON.parse(decryptedText.substr(0, decryptedText.length - 1))
} catch(ex) {
  console.log("==================================================")
  console.log("ERROR! JSON parse failed. Is this a Kepler packet?")
  console.log("==================================================")
  process.exit(1)
}
console.log("Decrypted packet as JSON:")
console.log("=========================")
console.log(obj)
console.log()

console.log("Raw decrypted text:")
console.log("===================")
console.log(decryptedText)
console.log()
