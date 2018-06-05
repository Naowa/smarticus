#include <Wire.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <ArduinoJson.h>
#include <Adafruit_APDS9960.h>


#define MOTION_PIN 2
#define LED_PIN 5
#define IP "http://169.234.50.180:3000/detections" //UCI_NET_MOBILE WIFI
//#define IP "http://100.67.0.157:3000/detections" //VDC WIFI
#define DEBUG 1
#define MIC_PIN A0

static int state = 0;
static int motionDetect = 0;
static int micDetect = 0;
static int volDetect = 0;
static int gestureDetect = 0;
static int lightDetect = 0;
static int activateDim = 0;
static int brightness = 0;

static const int sampleTime = 50; 
static int micOut;

Adafruit_APDS9960 apds;

static uint16_t ambient_light = 0;
static int my_ambient;

void printState() {
  if (!activateDim) {
    if (state) Serial.println("STATE: ON");
    else Serial.println("STATE: OFF");
  }
  else {
    if (state) {
      Serial.print("STATE: ON, BRIGHTNESS: ");
      Serial.println(brightness);
    }
    else Serial.println("STATE: OFF");
  }
}

void printStatus(int code) {
  if (code == -11 || code == 200) Serial.println("STATUS: OK");
  else Serial.println("STATUS: ERROR");
}

// Find the Peak-to-Peak Amplitude Function
int findPTPAmp(){
// Time variables to find the peak-to-peak amplitude
   unsigned long startTime= millis();  // Start of sample window
   unsigned int PTPAmp = 0; 

// Signal variables to find the peak-to-peak amplitude
   unsigned int maxAmp = 0;
   unsigned int minAmp = 1023;

// Find the max and min of the mic output within the 50 ms timeframe
   while(millis() - startTime < sampleTime) 
   {
      micOut = analogRead(MIC_PIN);
      if( micOut < 1023) //prevent erroneous readings
      {
        if (micOut > maxAmp)
        {
          maxAmp = micOut; //save only the max reading
        }
        else if (micOut < minAmp)
        {
          minAmp = micOut; //save only the min reading
        }
      }
   }

  PTPAmp = maxAmp - minAmp; // (max amp) - (min amp) = peak-to-peak amplitude
  double micOut_Volts = (PTPAmp * 3.3) / 1023; // Convert ADC into voltage

  //Uncomment this line for help debugging (be sure to also comment out the VUMeter function)
  //Serial.println(PTPAmp); 

  //Return the PTP amplitude to use in the soundLevel function. 
  // You can also return the micOut_Volts if you prefer to use the voltage level.
  return PTPAmp;   
}

// Volume Unit Meter function: map the PTP amplitude to a volume unit between 0 and 10.
int VUMeter(int micAmp){
  int preValue = 0;

  // Map the mic peak-to-peak amplitude to a volume unit between 0 and 10.
   // Amplitude is used instead of voltage to give a larger (and more accurate) range for the map function.
   // This is just one way to do this -- test out different approaches!
  int fill = map(micAmp, 23, 750, 0, 10); 

  // Only return the volume unit value if it changes from previous value
  return fill;
}

int handleLight() {
  uint16_t red = 0;
  uint16_t green = 0;
  uint16_t blue = 0;
  uint16_t c = 0;
  apds.getColorData(&red, &green, &blue, &c);
  /*Serial.print("red: "); Serial.print(red);
  Serial.print(" green: "); Serial.print(green);
  Serial.print(" blue: "); Serial.print(blue);
  Serial.print(" clear: "); Serial.print(c);
  ambient_light = apds.calculateLux(red, green, blue);
  Serial.print(" ambient: "); Serial.println(ambient_light);*/
  ambient_light = apds.calculateLux(red, green, blue);
  my_ambient = map(ambient_light, 2, 100, 0, 100);
  if (my_ambient > 100) my_ambient = 100;
  return my_ambient;
}

void getState() {
  HTTPClient http;
  http.begin(IP);
  int httpCode = http.GET();

  if (httpCode > 0) { //Check the returning code

    String payload = http.getString();
    
    if (DEBUG) {
      Serial.println("STATE PAYLOAD: ");
      Serial.println(payload);
    }
    
    StaticJsonBuffer<300> jsonBuffer;
    JsonObject& data = jsonBuffer.parseObject(payload);

    if (!data.success()) {
      Serial.print("parseObject(");
      Serial.print(payload);
      Serial.println(") failed");
      return;
    }
    
    if (data["state"] == "OFF") {
      state = 0;
      digitalWrite(LED_PIN, HIGH);
    }
    else {
      state = 1;
      digitalWrite(LED_PIN, LOW);
    }

    motionDetect = data["detectMotion"];
    micDetect = data["detectFreq"];
    volDetect = data["detectVol"];
    gestureDetect = data["detectGesture"];
    lightDetect = data["detectLight"];
    activateDim = data["activateDim"];
    brightness = data["brightPercent"];

    if (DEBUG) {
      Serial.println("Detect Motion: ");
      Serial.println(motionDetect);

      Serial.println("Detect Freq: ");
      Serial.println(micDetect);

      Serial.println("Detect Volume: ");
      Serial.println(volDetect);

      Serial.println("Detect Gesture: ");
      Serial.println(gestureDetect);

      Serial.println("Detect Light: ");
      Serial.println(lightDetect);

      Serial.println("Dimming Active");
      Serial.println(activateDim);
    }
  }
}

void postMotion() {
  StaticJsonBuffer<300> JSONbuffer;   //Declaring static JSON buffer
  JsonObject& JSONencoder = JSONbuffer.createObject(); 

  JSONencoder["sensorType"] = "MOTION";

  JSONencoder["prevState"] = state;

  char JSONmessageBuffer[300];
  JSONencoder.prettyPrintTo(JSONmessageBuffer, sizeof(JSONmessageBuffer));
  if(DEBUG) {
    Serial.println("MESSAGE SENT: ");
    Serial.println(JSONmessageBuffer);
  }

  HTTPClient http;    //Declare object of class HTTPClient

  http.begin(IP);      //Specify request destination
  http.addHeader("Content-Type", "application/json");  //Specify content-type header

  int httpCode = http.POST(JSONmessageBuffer);   //Send the request
  String payload = http.getString();                                        //Get the response payload

  if(DEBUG) {
    printStatus(httpCode);   //Print HTTP return code
    if (payload) Serial.println("PAYLOAD: ");
    Serial.println(payload);    //Print request response payload
  }
  http.end();  //Close connection
}

void postMic() {
  StaticJsonBuffer<300> JSONbuffer;   //Declaring static JSON buffer
  JsonObject& JSONencoder = JSONbuffer.createObject(); 

  JSONencoder["sensorType"] = "FREQUENCY";

  JSONencoder["prevState"] = state;

  JsonArray& values = JSONencoder.createNestedArray("values");

  int rate = 100;
  while (rate) {
    values.add(analogRead(MIC_PIN));
    //Serial.println(millis());
    delay(20);
    --rate;
  }

  char JSONmessageBuffer[300];
  JSONencoder.prettyPrintTo(JSONmessageBuffer, sizeof(JSONmessageBuffer));
  if(DEBUG) {
    Serial.println("MESSAGE SENT: ");
    Serial.println(JSONmessageBuffer);
  }

  HTTPClient http;    //Declare object of class HTTPClient

  http.begin(IP);      //Specify request destination
  http.addHeader("Content-Type", "application/json");  //Specify content-type header

  int httpCode = http.POST(JSONmessageBuffer);   //Send the request
  String payload = http.getString();                                        //Get the response payload

  if(DEBUG) {
    printStatus(httpCode);   //Print HTTP return code
    if (payload) Serial.println("PAYLOAD: ");
    Serial.println(payload);    //Print request response payload
  }
  http.end();  //Close connection
}

void postVol() {
  StaticJsonBuffer<300> JSONbuffer;   //Declaring static JSON buffer
  JsonObject& JSONencoder = JSONbuffer.createObject(); 

  JSONencoder["sensorType"] = "VOLUME";

  JSONencoder["prevState"] = state;

  int micOutput = findPTPAmp();
  JSONencoder["value"] = VUMeter(micOutput);

  if (JSONencoder["value"] > 0) {
    char JSONmessageBuffer[300];
    JSONencoder.prettyPrintTo(JSONmessageBuffer, sizeof(JSONmessageBuffer));
    if(DEBUG) {
      Serial.println("MESSAGE SENT: ");
      Serial.println(JSONmessageBuffer);
    }
  
    HTTPClient http;    //Declare object of class HTTPClient
  
    http.begin(IP);      //Specify request destination
    http.addHeader("Content-Type", "application/json");  //Specify content-type header
  
    int httpCode = http.POST(JSONmessageBuffer);   //Send the request
    String payload = http.getString();                                        //Get the response payload
  
    if(DEBUG) {
      printStatus(httpCode);   //Print HTTP return code
      if (payload) Serial.println("PAYLOAD: ");
      Serial.println(payload);    //Print request response payload
    }
    http.end();  //Close connection
  }
}

void postLight() {
  StaticJsonBuffer<300> JSONbuffer;   //Declaring static JSON buffer
  JsonObject& JSONencoder = JSONbuffer.createObject(); 

  JSONencoder["sensorType"] = "LIGHT";

  JSONencoder["prevState"] = state;
  JSONencoder["value"] = handleLight();

  if (JSONencoder["value"] > 0) {
    char JSONmessageBuffer[300];
    JSONencoder.prettyPrintTo(JSONmessageBuffer, sizeof(JSONmessageBuffer));
    if(DEBUG) {
      Serial.println("MESSAGE SENT: ");
      Serial.println(JSONmessageBuffer);
    }
  
    HTTPClient http;    //Declare object of class HTTPClient
  
    http.begin(IP);      //Specify request destination
    http.addHeader("Content-Type", "application/json");  //Specify content-type header
  
    int httpCode = http.POST(JSONmessageBuffer);   //Send the request
    String payload = http.getString();                                        //Get the response payload
  
    if(DEBUG) {
      printStatus(httpCode);   //Print HTTP return code
      if (payload) Serial.println("PAYLOAD: ");
      Serial.println(payload);    //Print request response payload
    }
    http.end();  //Close connection
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin();
  delay(100);
  
  
  if(!apds.begin()){
      Serial.println("Something went wrong during APDS-9960 init");
  } else{
      Serial.println("APPDS-9960 initialization complete");
  }
  
  //Start running color sensor
  apds.enableColor(true);
  
  apds.disableColorInterrupt();
  
  delay(500);
  
  pinMode(MOTION_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  pinMode(MIC_PIN, INPUT_PULLUP);                             //Serial connection
  WiFi.begin("UCInet Mobile Access", "");    //WiFi connection
  //WiFi.begin("VDC", "gwyu413$");    //WiFi connection
  while (WiFi.status() != WL_CONNECTED) {  //Wait for the WiFI connection
 
    delay(500);
    Serial.println("Waiting for connection");
 
  }
  
}

void loop() {
  Serial.println("__________________________________");
  if (WiFi.status() == WL_CONNECTED) { //Check WiFi connection status
    int motionRead = digitalRead(MOTION_PIN);
    if (motionDetect && !motionRead) postMotion();
    if (micDetect) postMic();
    if (volDetect) postVol();
    if (lightDetect) postLight();
    getState();  
  } 
  else {
    Serial.println("Error in WiFi connection");
  }
  printState();
  delay(1000);  //Send a request every second
}
