# Smarticus

## Overiew
Smarticus is a smart lamp that knows when to turn on and off. Smarticus gathers information on ambient light, volume, and motion, using this information along with user settings to determine its state. A web application is used to change settings and view usage statistics.

## Parts
PIR Motion Detector
ESP8266 Microcontroller
APDS-9960 RGB and Gesture Sensor
ADMP-401 Microphone Breakout


## Hardware Setup
![alt text](https://i.imgur.com/dDUgKmw.jpg "Crude photo of the hardware wired on a breadboard")

## Software Setup
### Board:
Install these libraries:
  ESP8266HTTPClient.h
  ESP8266WiFi.h
  ArduinoJson.h
  Adafruit_APDS9960.h
  Wire.h
Use Smarticus 2

### Server/Web-app:
Setup mongodb database
cd into project
npm install
run mongod.exe
run with node (nodemon/node start)
Go to localhost:3000


## Features
### Lamp (LED)
Currently the onboard LED is used to emulate a bulb. The state of the lamp can also be seen by using the serial monitor.

### Web App Interface
A mobile-compatible web app to serve as a remote, configuration menu, and data analytics display.	

### Sensor Toggling
Users can choose which sensors they want to be active through the web application.

### Timeout
Users can specify a timeout (by minutes). The timeout determines how long the light will stay on after sensing either ambient light, volume, or motion.

### Debug Mode
Used for testing. Can be toggled on through web app. Will increase the timeout by a factor of 10.

### Frequency Detection (Disabled)
Would have detected if a person was speaking in the room based on their frequency. Could not get working. Option disabled through web app.

### Volume Detection
Users can set a threshold for volume. If the sensor detects volume beyond this threshold, the light will turn on.

### Ambient Light Detection
Users can set a threshold (from 0 to 99) for ambient light detection. If ambient light sensed goes below that threshold, the light will turn on.

### Variant Light Percentage
The user can opt to have the lamp’s light dim or brighten based on the ambient light. For instance, if the ambient light in a room is detected to be at 20% brightness, the lamp’s light will be at 80% brightness. (Note that brightness percentage is only projected through the serial monitor.)

### Gesture-based on/off (Disabled)
Would have been able to toggle the lamp’s state by running your hand across the gesture/light sensor back-and-forth. Could not get to work. Disabled through web app.

### Manual on/off
User can turn light on and off from the web application.

### Data Analytics
The web application shows usage statistics as various graphs. 
