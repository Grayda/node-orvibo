node-orvibo
===========

This package lets you control various Orvibo products from node.js. It's more or less a direct separation from my [ninja-allone library](http://github.com/Grayda/ninja-allone), but with added RF support.

This library hasn't been tested in a while, but should still work. RF stuff is untested, as I don't own the RF switches. Kepler support is planned, once I can find someone who is willing to donate / sell me their Kepler unit.

Supported products
==================

This library supports the S10 and S20 sockets, which is sold under a variety of names, including:

- Arlec PC180 (sold at Bunnings, Australia)
- Bauhn W2 (sold at Aldi Australia)
- Bayit Home Automation BH1810 at [Home Depot](http://www.homedepot.com/p/Bayit-Home-Automation-On-Off-Switch-Wi-Fi-Socket-BH1810/205824507) and [WalMart](http://www.walmart.com/ip/Bayit-Home-Automation-BH1810-Wifi-Socket/43791011)
- ON THE WAY, [available on Amazon](http://www.amazon.com/WAY%C2%AERemote-Control-Electronics-Automation-3Samsung/dp/B00S4NULPO/ref=sr_1_2?ie=UTF8&qid=1426736382&sr=8-2&keywords=bayit+smart+wi-fi+socket)
- Orvibo on [Aliexpress](http://www.aliexpress.com/wholesale?catId=0&initiative_id=SB_20150318191819&SearchText=Orvibo+s20) and also on [Banggood](http://www.banggood.com/WiWo-S20-Wi-Fi-Smart-Remote-Control-Timing-Socket-USEU-Plug-p-953743.html)

It also supports the AllOne, which is an IR / RF blaster.

There is no support for the [Kepler gas detector](https://www.kickstarter.com/projects/28240313/kepler-your-best-home-gas-detector) yet, but [go-orvibo](http://github.com/Grayda/go-orvibo) can detect them. As soon as I can get my hands on a Kepler, I can add in the remaining code.

Helping out
===========

I'm looking for hardware donations. If you own an RF switch or a Kepler and are willing to donate them, please contact me using the address on my GitHub profile. Likewise, if you'd like to donate money to cover hardware and programming costs, I accept PayPal. Just head to http://paypal.me/davidgrayPhotography

I'd also love pull requests and forks. As I no longer use my Orvibo products with node.js, my time spent maintaining this package will be low, so by all means raise issues, pull, fork and do whatever you can to help out :)

Usage
=====

See `tests/index.js` for a near-complete sample. Protocol can be found here: http://pastebin.com/TSK4Lu4Q

To-Do
=====

- [ ] Add Kepler support
- [ ] Test RF stuff
- [ ] Create proper protocol document, including RF documentation
- [ ] Include emulator
- [ ] Rewrite this whole thing, now that I've learned so much more about node
