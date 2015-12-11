node-orvibo
===========

This package lets you control various Orvibo products from node.js. It's more or less a direct separation from my [ninja-allone library](http://github.com/Grayda/ninja-allone), but with added RF support.

This library hasn't been tested in a while, but should still work. RF stuff is untested, as I don't own the RF switches. Kepler support is planned, once I can find someone who is willing to donate / sell me their Kepler unit.

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
