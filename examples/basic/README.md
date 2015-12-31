# About this example #
This example shows the basics of discovering, subscribing, querying and controlling Orvibo devices. Before you run this example, please ensure any sockets aren't controlling important devices (e.g. computers), as running this demo will toggle sockets on and off!

# Running this example
This example works best if you set the DEBUG environment variable. On Linux, you can run `DEBUG=Orvibo node index.js`. On Windows, run `set DEBUG=Orvibo`, then `node index.js`

This example will find any compatible Orvibo devices and control them. If it's a socket, the code will toggle the state every 5 seconds. If it's an AllOne, it'll enter learning mode, then play back any IR code it found, two seconds after it received it. 
