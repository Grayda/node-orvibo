# Orvibo Protocol Documentation
**THIS DOCUMENT IS A WORK IN PROGRESS. It will change as time goes on**

This document provides information about the protocol used to control Orvibo products, including the S10 / S20 WiFi sockets, plus the AllOne IR blaster. Kepler support is coming soon.

Every packet described in this document is in hex. You need to decode from hex prior to sending

## Credits / Acknowledgements
Credit goes to Nozza87 over on the Ninja Blocks forum for his initial documentation of the protocol. Also a big thanks to Vince Vinci who kindly provided Wireshark captures, plus did some testing with my code, plus ran some tests for me.

## About Communications
 * All communications take place on UDP port 10,000
 * The initial discovery of devices is done via UDP broadcast (e.g. 255.255.255.255)

## Message Format
All packets follow the same format:

 `<magic word> <packet length> <command ID> <MAC address> <MAC address padding> <command ID-specific data>`

  * The Magic Word identifies the packet as being Orvibo-related. This is always `6864` (or `hd` in ASCII)
  * Packet length is two bytes, so a packet with a length of 6 bytes is `0006`, while a packet with a length of 45 bytes is `002D`
  * Command IDs are listed below, and their ASCII equivalent is roughly an indication of what it does (e.g. `rs` = Reset)
    * The initial discovery packets have a three-byte command ID (e.g. `716100`)
  * MAC addresses always(?) start with `ACCF` and both the app and the devices don't check that the MAC from the packet matches the MAC you presented, meaning writing an emulator or spoofing an existing device can be easily done
  * MAC address padding is always `202020202020`
    * In the WiWo app, the UUID is MAC Address + Padding (e.g. `ACCFDEADBEEF202020202020`)
  * Command ID specific data is listed below.

## Device types
When an Orvibo device responds to a "search" packet, it includes a device identifier which lets you know what type of device it is. It's in the format of `xxxyyy`, where `xxx` is a three character hardware identifier, and `yyy` is possibly a hardware revision or firmware version identifier. Possible hardware identifiers include:

* `IRD`- AllOne IR blaster
* `SOC` - S10 / S20 WiFi sockets
* `RFG` - Kepler gas detector(?)

RF switches don't have a hardware identifier, as they run on 433mhz and are stateless, plus communication is one-way, as mentioned below

## About RF switches
I don't own any RF switches, so the information provided here is obtained from grabbing info from Android's LogCat, spoofing AllOnes to obtain messages and testing by Vince. I also don't have an iDevice, so info may vary between platforms

The AllOne is listed as having RF support. As far as I can tell, it's one-way communication and the packets might be crafted for use with the RF switches only. That means you can't pass it an arbitrary string to ring your RF doorbell, nor can you "clone" and "replay" codes. If you're looking for wider 433mhz support, I suggest the Broadlink RM2 Pro which supports 433mhz (and possibly other frequencies too)

RF on the AllOne works like this (roughly):

 * Install the RF switch and hold the button down to put it into learning mode
 * Go into the WiWo app and create a new Switch or Light device under the AllOne
   * This device is **NOT** stored on the AllOne!
 * When the device is being created:
   * A session ID is created by the operating system. I don't think it matters what the value is, as long as it's 4 bytes
   * An "RF key" is assigned to the device. I think it's two bytes, little endian, and usually starts at around 40 (2800 in hex) but can be any number up to 65535 (though this is untested. Values up to 255 will work)
   * An RF ID is created by the operating system. Not sure by what means, as the code persists across multiple deletes and re-adds of Light and Switch devices, but changes sometimes when a new device is added. On my emulator (in which 75% of the information is hard-coded), the RF ID I got from the WiWo app didn't match anything in my code, but also changed after a while of testing, so it's definitely OS based
 * Once the device is created, go in to the new Switch or Light and press a button
 * The RF switch will exit learning mode. I'm not sure what it learns, but I believe it's RF key + RF ID

 I think this prevents other devices from adding the same RF switch (so you can't control 1 light with 2 phones without some trickery), but a remote for these RF switches exists, so you should be able to control 1 light with a phone and any number of remotes.

## Command IDs

Replace `accfdeadbeef` with your own MAC address. Orvibo device should respond with the same command ID on success(?)

### `7161` - Find Orvibo devices
This command finds an Orvibo device. You can search for all devices, or just one, if you know the MAC address.

#### Send
If you want to find all devices, send `686400067161`to 255.255.255.255
If you want to find one device and know its MAC address, send `686400127167accf232419c0202020202020` to 255.255.255.255 or the IP address

`6864` - Magic Word

`002A` - Packet length

`7161` - Command ID

`ACCF232419C0` - MAC address

`202020202020` - MAC address padding


#### Receive ####
`6864002A716100ACCF232419C0202020202020C0192423CFAC202020202020534F4330303228CA6CD701`

`6864` - Magic Word

`002A` - Packet length

`7161` - Command ID - `qa` in ASCII

`00`   - Unknown, possibly denotes this packet being a response?

`ACCF232419C0` - MAC address

`202020202020` - MAC address padding

`C0192423CFAC` - MAC address, little endian

`202020202020` - MAC address padding

`534F43303032` - `IRD005` in ASCII. The type of device this is. See "device types" above

`28CA6C` - Possible time since manufacture -  ((28:40) + (ca:202) * 255 + (6c:108) * 255 * 255 = 7074210 seconds = 81.87743055555556 days)

`D7` - Unknown

`01` - Current state of the device. `00` = off, `01` = on


### `636C` - Subscribe to a device
This command "subscribes" to a device so you can control it. Every command, except for the discovery command, requires that you be subscribed to a device first. Subscriptions expire after about 5 minutes or so, so be sure to re-send this packet once every few minutes to prevent commands from not being acted upon

#### Send
`6864001e636caccf232419c0202020202020c0192423cfac202020202020`

`6864` - Magic Word

`0018` - Packet length

`636C` - Command ID - `cl` in ASCII

`ACCF232419C0` - MAC address

`202020202020` - MAC address padding

`c0192423cfac` - MAC address, little endian (called "local password" in the WiWo database)

`202020202020` - MAC address padding


#### Receive ####
`68640018636CACCF232419C0202020202020000000000000`

`6864` - Magic Word

`0018` - Packet length

`636C` - Command ID - `cl` in ASCII

`ACCF232419C0` - MAC address

`202020202020` - MAC address padding

`000000000000` - Unknown
