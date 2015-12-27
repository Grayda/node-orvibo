# About this example #
This example shows how to connect an Orvibo product to your network. There are two methods available, UDP packet length (not recommended) and AP Serial. Please see PROTOCOL.md in the root of the project folder for more information on the two methods.

# Running this example
In order to run this example, you need to factory reset your Orvibo device which WILL erase all timers and other stored settings. Which method you use determines what factory reset "mode" you need to be in.

If using Method 1 (UDP packet length), you need to be in "red" reset mode. Simply hold down the reset button on your device until the status light rapidly blinks red. Go into index.js, uncomment the `o.setupDevice` line and change the password string. Run `node index.js` in this folder.

If using Method 2 (AP Serial), put the device into "red" reset mode, then hold the reset button down again until the device shows a rapidly blinking blue light. At this point a new open wireless network will appear. Connect to it, then go into index.js, change the `o.setupDeviceAP` lines to match your network configuration, then run `node index.js` in this folder
