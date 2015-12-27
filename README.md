node-orvibo
===========

This package lets you control various Orvibo products from node.js. It's a rewritten separation from my [ninja-allone library](http://github.com/Grayda/ninja-allone), but with added RF support.

This library has been tested with an AllOne and two sockets. RF support should work, but is untested because I don't own any RF switches. There is no Kepler support (other than knowing when one is on the network) for the same reason.

Features
========

 - Learn and play back IR codes using the AllOne IR blaster
 - Use the AllOne to emit RF to control RF light switches
 - Turn WiFi sockets on and off
 - Set up Orvibo devices without needing a smartphone


Supported products
==================

This library supports the S10 and S20 sockets, which is sold under a variety of names, including:

- Arlec PC180 (sold at Bunnings, Australia)
- Bauhn W2 (sold at Aldi Australia)
- Bayit Home Automation BH1810 at [Home Depot](http://www.homedepot.com/p/Bayit-Home-Automation-On-Off-Switch-Wi-Fi-Socket-BH1810/205824507) and [WalMart](http://www.walmart.com/ip/Bayit-Home-Automation-BH1810-Wifi-Socket/43791011)
- ON THE WAY, [available on Amazon](http://www.amazon.com/WAY%C2%AERemote-Control-Electronics-Automation-3Samsung/dp/B00S4NULPO/ref=sr_1_2?ie=UTF8&qid=1426736382&sr=8-2&keywords=bayit+smart+wi-fi+socket)
- Orvibo on [Aliexpress](http://www.aliexpress.com/wholesale?catId=0&initiative_id=SB_20150318191819&SearchText=Orvibo+s20) and also on [Banggood](http://www.banggood.com/WiWo-S20-Wi-Fi-Smart-Remote-Control-Timing-Socket-USEU-Plug-p-953743.html)

It also supports the AllOne, which is an IR / RF blaster. RF support should work, but switches can't be auto-detected, so you can't "detect and control" RF units

There is no support for the [Kepler gas detector](https://www.kickstarter.com/projects/28240313/kepler-your-best-home-gas-detector) yet, but as soon as I can get my hands on a Kepler, I can add in the remaining code.

Helping out
===========

I'm looking for hardware donations. If you own an RF switch or a Kepler and are willing to donate them, please contact me using the address on my GitHub profile. Likewise, if you'd like to donate money to cover hardware and programming costs, I accept PayPal and Bitcoin. Just head to http://paypal.me/davidgrayPhotography for PayPal, or send me some delicious digital currency with Bitcoin: 34agreMVU8QeHu4cLLPkyw5EYdSKp6NqTV

I'd also love pull requests and forks. As I no longer use my Orvibo products with node.js, my time spent maintaining this package will be low, so by all means raise issues, pull, fork and do whatever you can to help out :)

Usage
=====

Install using `npm install --save node-orvibo`

See `examples/basic/index.js` for a near-complete sample. Check PROTOCOL.md for protocol, but also check out this Pastebin for a more complete documentation: http://pastebin.com/TSK4Lu4Q

What's New?
===========

 - 27/12/2015
   - You can now set up a device without the WiWo app.
   - PROTOCOL.md updated. Still needs work, but is growing every Day
   - New examples added, and "basic" example updated to emit IR AND RF
   - Various bugfixes, plus new events added

To-Do
=====

- [ ] Add Kepler support
- [ ] Go through and clean up / standardize events being emitted
- [ ] Test RF stuff
- [ ] Finish off protocol documentation
- [ ] Include emulator
- [x] Rewrite this whole thing, now that I've learned so much more about node
