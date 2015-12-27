# Orvibo Protocol Documentation
**THIS DOCUMENT IS A WORK IN PROGRESS. It will change as time goes on**

This document provides information about the protocol used to control Orvibo products, including the S10 / S20 WiFi sockets, plus the AllOne IR blaster. Kepler support is coming soon.

Every packet described in this document is in hex, except where stated. You need to decode from hex prior to sending

## Credits / Acknowledgements
Credit goes to Nozza87 over on the Ninja Blocks forum for his initial documentation of the protocol. Also a big thanks to Vince Vinci who kindly provided Wireshark captures, plus did some testing with my code, plus ran some tests for me.

## About Communications
 * All communications take place on UDP port 10,000
   * Except for the Kepler, which takes place on UDP port 9,999, and setting up new sockets, which takes place on 48,899 or 49,999
 * The initial discovery of devices is done via UDP broadcast (e.g. 255.255.255.255)

## Message Format
All packets, except where stated, follow the same format:

 `<magic word> <packet length> <command ID> <MAC address> <MAC address padding> <command ID-specific data>`

  * The Magic Word identifies the packet as being Orvibo-related. This is always `6864` (or `hd` in ASCII)
  * Packet length is two bytes, so a packet with a length of 6 bytes is `0006`, while a packet with a length of 45 bytes is `002D`
  * Command IDs are listed below, and their ASCII equivalent is roughly an indication of what it does (e.g. `rs` = Reset)
    * The initial discovery packets have a three-byte command ID (e.g. `716100`) and is the _only_ command ID to do so
  * MAC addresses always(?) start with `ACCF` and both the app and the devices don't check that the MAC from the packet matches the MAC you presented, meaning writing an emulator or spoofing an existing device can be easily done
  * MAC address padding is always `202020202020`
    * In the WiWo app, the (U)UID is MAC Address + Padding (e.g. `ACCFDEADBEEF202020202020`)
  * Command ID specific data is listed below.

## Device types
When an Orvibo device responds to a "search" packet, it includes a device identifier which lets you know what type of device it is. It's in the format of `xxxyyy`, where `xxx` is a three character hardware identifier, and `yyy` is possibly a hardware revision or firmware version identifier. Possible hardware identifiers include:

* `IRD`- AllOne IR blaster
* `SOC` - S10 / S20 WiFi sockets
* `KEP` - Kepler gas detector
* `RFG` - Unknown. If you know, please submit a pull request

RF switches don't have a hardware identifier (?), as they run on 433mhz and are stateless, plus communication is one-way, as mentioned below

## About RF switches
I don't own any RF switches, so the information provided here is obtained from grabbing info from Android's LogCat, spoofing AllOnes to obtain messages and testing by Vince. I also don't have an iDevice, so info may vary between platforms

The AllOne is listed as having 433mhz support. As far as I can tell, it's one-way communication and the packets might be crafted for use with the RF switches only. That means you can't pass it an arbitrary string to ring your RF doorbell, nor can you "clone" and "replay" codes. If you're looking for wider 433mhz support, I suggest the Broadlink RM2 Pro which supports 433mhz (and possibly other frequencies too)

RF on the AllOne works like this (roughly):

 * Wire up the RF switch in your home and hold the button down to put it into learning mode (it'll beep)
 * Go into the WiWo app and create a new Switch or Light device under the AllOne
   * This device is **NOT** stored on the AllOne!
 * When the device is being created:
   * A session ID is created by the operating system. I don't think it matters what the value is, as long as it's 4 bytes
   * An "RF key" is assigned to the device. I think it's two bytes, little endian, and usually starts at around 40 (2800 in hex) but can be any number up to 65535 (though this is untested. Values up to 255 will work)
   * An RF ID is created by the operating system. Not sure by what means, as the code persists across multiple deletes and re-adds of Light and Switch devices, but changes sometimes when a new device is added. On my emulator (in which 75% of the information is hard-coded), the RF ID I got from the WiWo app didn't match anything in my code, but also changed after a while of testing, so it's definitely OS based
 * Once the device is created, go in to the new Switch or Light and press a button
 * The RF switch will exit learning mode. I'm not sure what it learns, but I believe it's RF key + RF ID

 I think this prevents other devices from adding the same RF switch (so you can't control 1 light with 2 phones without some trickery), but a remote for these RF switches exists, so you should be able to control 1 light with a phone and any number of remotes.

## About the Kepler
The Kepler gas detector is / was a Kickstarter project. It was a "20%" time project by a small independent team from Orvibo. It's designed to detect "natural gas, H2, LPG, CH4, C4H10, propane, and butane, along with carbon monoxide", as well as act like a kitchen timer. It seems to communicate in much the same way as the other Orvibo products, but on port 9,999 instead. I think it also communicates via JSON, but without one to test, I can't be sure.

## Setting up a socket without the WiWo app
There are two ways to set up a socket from scratch. The first is easier for the user, but very unreliable, the second requires that you connect to the device's access point but is fast and stable

### Method 1: UDP packet lengths
The "High-Flying" chip used in many (if not all?) Orvibo products can apparently sniff wireless traffic for networks it's not connected to. That's why you can unbox a new device, plug it in and use the WiWo app to find and configure it, despite the device not emitting it's own access point. When sniffing, the device looks for packets sent to a broadcast address, containing nothing but `0x05`, and uses the length of the packet to determine the password. http://blog.slange.co.uk/orvibo-s20-wifi-power-socket/ has an overview and some links to data sheets, but basically, you do this:

- Put your device into "red" reset mode (if it's not already blinking a red light rapidly, press and hold the button on the unit until it starts blinking red rapidly. If it's blue and blinking, remove power, plug it back in and try again)
- UDP has an overhead of 42 bytes, which you'll see mentioned below. All packets need to go to your broadcast address on port 49999
- On your wireless network, send out **400** packets. Each packet must be 118 bytes long. So you (the programmer) send 76 bytes of `0x05` and with the 42 bytes of UDP data, that's 118 bytes total.
- Send 6 packets of 131 bytes (so 89 bytes of `0x05` from you, 42 gets tacked on by UDP)
- Loop through the letters of your WiFi password. Convert each character to decimal (so `a` = 97, `b` = 98 etc.) then add 76 to that. Send that many bytes. So if your first letter is `a`, send 97 + 76 + 42 bytes total (173 of `0x05` from you, 42 from UDP). **Send that packet TWICE**
- Send 6 packets. Total length is 128 (so 86 bytes of `0x05` from you, plus 42 bytes from UDP)
- Send 6 packets. Total length is 374 + password length (so 332 + password length of `0x05` from you, 42 bytes from UDP)
- Repeat all packets (_EXCEPT_ for the initial **400** packet message) until the device is connected, or 60 seconds has elapsed, whichever is closer.

This method isn't very reliable and worked for me once out of about 40 tries. It might work better on WEP or open networks, but I don't know.

### Method 2: Serial commands
This is the fastest way to connect a unit, but requires some manual steps. The "High-Flying" chip is also a WiFi-Serial bridge so you can set SSID, passwords and such via UDP!

 - Packets need to be sent to the broadcast address on port 48899 (take care not to get this port mixed up with the one from method 1!)
 - Put the device into "blue" reset mode (a.k.a AP mode). To do this, put the unit into "red" reset mode, then hold down the device button again until it starts blinking blue rapidly.
 - The unit will create an AP that you can connect to (e.g. the AllOne's AP name is called `WiWo-AllOne`)
 - Send the string `HF-A11ASSISTHREAD`
 - The device will respond with a message containing the IP address, MAC Address and Hostname
 - Confirm you got this message by sending `+ok`
 - Send `AT+WSSSID=mynetwork\r`, replacing `mynetwork` with your network's SSID. `\r` is a carriage return
 - The device will return `+ok\n\n` on success, or `+ERR\n\n` if something went wrong (e.g. invalid characters etc.). `\n` is a line feed
 - Send `AT+WSKEY=auth,encryption,password123\r`. Replace `auth` with a valid authentication type, `encryption` with a valid encryption type, and `password123` with your SSID password
   - Authentication types include:
     - `OPEN`
     - `SHARED`
     - `WPAPSK`
     - `WPA2PSK`
   - Encryption types include:
     - `NONE` (used with `OPEN` auth type above)
     - `WEP-H` (WEP key, hexadecimal. Used with `OPEN` or `SHARED`)
     - `WEP-A` (WEP key, ASCII. Used with `OPEN` or `SHARED`)
     - `TKIP` (for use with `WPAPSK` or `WPA2PSK`)
     - `AES` (for use with `WPAPSK` or `WPA2PSK`)
   - `WEP-H` passwords are either 10 oe 26 characters long, `WEP-A` passwords are 5 or 13 characters long, `TKIP` and `AES` are between 8-64 characters
- The device will respond with `+ok\n\n`
- Put the device into station mode with `AT+WMODE=STA\r`.
- The device will respond with `+ok\n\n`
- Reset the socket with `AT+Z\r`
- Connect back to your WiFi. The device is now ready to be discovered

## Command IDs

Replace `accfdeadbeef` with your own MAC address. Orvibo device should respond with the same command ID on success(?)

### `7161` - Find Orvibo devices
This command finds an Orvibo device. You can search for all devices, or just one, if you know the MAC address. Send the following packet to 255.255.255.255, or to the IP address (if known) when targeting a specific device

#### Send

| Magic  Word | Packet Length | Command ID | MAC Address (Optional) | MAC Address Padding (Optional) |
|-------------|---------------|------------|------------------------|--------------------------------|
| 6864        | 002A          | 7161       | ACCFDEADBEEF           | 202020202020                   |

#### Receive ####
| Magic  Word | Packet Length | Command ID* | MAC Address  | MAC Address Padding | MAC Address (Little Endian)** | MAC Address Padding | Hardware Identifier | Time Since Manufacture*** | Unknown | Current State |
|-------------|---------------|-------------|--------------|---------------------|-------------------------------|---------------------|---------------------|---------------------------|---------|---------------|
| 6864        | 002A          | 716100      | ACCFDEADBEEF | 202020202020        | C0192423CFAC                  | 202020202020        | 534F43303032        | 28CA6C                    | D7      | 01            |

\* Could be firmware bug, as this is the only command that has a "three byte" Command ID

\*\* This (along with the MAC padding) is referred to as the "local password" in the WiWo app database

\*\*\* ((28:40) + (ca:202) * 255 + (6c:108) * 255 * 255 = 7074210 seconds = 81.87743055555556 days)

### `636C` - Subscribe to a device
This command "subscribes" to a device so you can control it. Every command, except for the discovery command, requires that you be subscribed to a device first. Subscriptions expire after about 5 minutes or so, so be sure to re-send this packet once every few minutes to prevent commands from not being acted upon

#### Send

| Magic  Word | Packet Length | Command ID | MAC Address (Optional) | MAC Address Padding (Optional) |
|-------------|---------------|------------|------------------------|--------------------------------|
| 6864        | 0018          | 636C       | ACCFDEADBEEF           | 202020202020                   |

#### Receive ####

| Magic  Word | Packet Length | Command ID | MAC Address  | MAC Address Padding | Unknown      |
|-------------|---------------|------------|--------------|---------------------|--------------|
| 6864        | 0018          | 636c       | ACCFDEADBEEF | 202020202020        | 000000000000 |

### `7274` - Request Table (Query)
This command "queries" the device for information. The information that it returns depends on what "table number" you request:

Table 01 - Information about the available tables
Table 02 - Not yet documented
Table 03 - Timing information
Table 04 - Device information (name, icon index etc.)

#### Send

| Magic  Word | Packet Length | Command ID | MAC Address  | MAC Address Padding | Unknown  | Table Number | Unknown      |
|-------------|---------------|------------|--------------|---------------------|----------|--------------|--------------|
| 6864        | 001D          | 7274       | ACCFDEADBEEF | 202020202020        | 00000000 | 01           | 000000000000 |

#### Receive (Table 1)
| Magic  Word | Packet Length | Command ID | MAC Address  | MAC Address Padding | Unknown  | Table Number | Unknown  | Record Length (Little Endian) | Version Number (Little Endian) | Table Number (Little Endian) | Version Flag (Little Endian) |     |
|-------------|---------------|------------|--------------|---------------------|----------|--------------|----------|-------------------------------|--------------------------------|------------------------------|------------------------------|-----|
| 6864        | 002C          | 7274       | ACCFDEADBEEF | 202020202020        | 00000000 | 01           | 00010000 | 0600                          | 0400                           | 0400                         | 1700                         | ... |

Record Length, Version Number, Table Number and Version Flag are repeated for each record that is available.

#### Receive (Table 3)
| Magic  Word | Packet Length | Command ID | MAC Address  | MAC Address Padding | Record ID (Little Endian) | Unknown | Table Number | Unknown  | Record Length (Little Endian) | Record Number (Little Endian) | Unknown                          | Power State (Little Endian) | Year (Little Endian) | Month | Day | Hour (+2?)* | Minute | Second | Repeat** |     |
|-------------|---------------|------------|--------------|---------------------|---------------------------|---------|--------------|----------|-------------------------------|-------------------------------|----------------------------------|-----------------------------|----------------------|-------|-----|-------------|--------|--------|----------|-----|
| 6864        | 002C          | 7274       | ACCFDEADBEEF | 202020202020        | 0200                      | 000000  | 03           | 00010000 | 1C00                          | 0100                          | E2728000630E0000005CDE1600A01900 | 0100                        | DE07                 | 07    | 0D  | 10          | 00     | 00     | FF       | ... |

Everything from Record Length (Little Endian) onwards is repeated for each scheduled item

\* Sample data from Nozza87 suggests you add + 2 to the hour, so 10 hex = 16 dec + 2 = 18 dec = 6pm

\*\* Repeat = 255 = Repeat Everyday (Bits: 128 = Repeat, 64 = Sunday, 32 = Monday, 16 = Tuesday, 8 = Wednesday, 4 = Thursday, 2 = Friday, 1 = Saturday)?

#### Receive (Table 4)
| Magic Key | Message Length | Command ID | MAC Address  | MAC Address Padding | Record ID (Little Endian) | Unknown | Table Number | Unknown  | Record Length (Little Endian) | Record Number (Little Endian) | Version ID (Little Endian) | MAC Address  | MAC Address Padding | MAC Address (Little Endian) | MAC Padding  | Remote Password* | Remote Password Padding | Socket Name** | Socket Name Padding  | Icon Index (Little Endian)*** | Hardware Version (Little Endian) | Firmware Version (Little Endian) | CC3000 Firmware Version (Little Endian)**** | Static Server Port (Little Endian) | Static Server IP | Domain Server Port (Little Endian) | Domain Server Name                     | Domain Server Name Padding                 | Local IP | Local Gateway | Local Subnet Mask | DHCP Mode***** | Discoverable | Timezone Set | Timezone | Unknown | Countdown (Little Endian) |
|-----------|----------------|------------|--------------|---------------------|---------------------------|---------|--------------|----------|-------------------------------|-------------------------------|----------------------------|--------------|---------------------|-----------------------------|--------------|------------------|-------------------------|---------------|----------------------|-------------------------------|----------------------------------|----------------------------------|---------------------------------------------|------------------------------------|------------------|------------------------------------|----------------------------------------|--------------------------------------------|----------|---------------|-------------------|----------------|--------------|--------------|----------|---------|---------------------------|
| 6864      | 00A8           | 7274       | ACCFDEADBEEF | 202020202020        | 0200                      | 000000  | 04           | 00010000 | 8A00                          | 0100                          | 4325                       | ACCFDEADBEEF | 202020202020        | EFBEADDECFAC                | 202020202020 | 383838383838     | 202020202020            | 4F6666696365  | 20202020202020202020 | 0500                          | 10000000                         | 0A000000                         | 05000000                                    | 1027                               | 2A796FD0         | 1027                               | 766963656E7465722E6F727669626F2E636F6D | 202020202020202020202020202020202020202020 | C0A801C8 | C0A80101      | FFFFFF00          | 01             | 01           | 00           | 08       | 0000    | 0C00                      |

\* Remote Password defaults to 888888 and could possibly be used for accessing Orvibo sockets via the internet

\*\* Socket Name has a maximum size of 16 characters (32 bytes). Adjust the padding as necessary

\*\*\* Icon index determines what icon to show in WiWo app. 0 = Light bulb, 1 = Fan, 2 = Thermostat, 3 = Double Switch, 4 = American Power Point, 5 = Australian Power Point

\*\*\*\* CC3000 is a WiFi chip created by TI. Nozza87 named this field in the original protocol document, but the sockets use WiFi modules created by "High-Flying", another Chinese Company, because High-Flying's assigned MAC address range starts with `ACCF23` and the AllOne, plus the S10 / S20 WiFi sockets all have this range.

\*\*\*\*\* 00 = Don't use DHCP (static local IP), 01 = Use DHCP
