#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "Led.hpp"
#include "Sonar.hpp"

#define F1 (uint8_t) 10
#define F2 (uint8_t) 100
#define LED_ON true
#define LED_OFF false
#define LED_PIN_GREEN (uint8_t) 5
#define LED_PIN_RED (uint8_t) 18
#define MSG_BUFFER_SIZE  50
#define SONAR_ECHO_PIN (uint8_t) 21
#define SONAR_TRIGGER_PIN (uint8_t) 19


/* wifi network info */
const char* ssid; //INSERISCI NOME RETE WI-FI
const char* password; //INSERISCI PASSWORD RETE WI-FI

/* MQTT topic */
const char* topic = "esiot-2023";

/* MQTT client management */
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsgTime = 0;
char msg[MSG_BUFFER_SIZE];
int value = 0;

Led greenLed = Led(LED_PIN_GREEN);
Led redLed = Led(LED_PIN_RED);
Sonar sonar = Sonar(SONAR_TRIGGER_PIN, SONAR_ECHO_PIN);
uint8_t scanDelay;

void updateLedStates(bool isNetOk, bool isSendDataOk) {
  if (isNetOk && isSendDataOk) {
    greenLed.setToggle(LED_ON);
    redLed.setToggle(LED_OFF);
  } else {
    greenLed.setToggle(LED_OFF);
    redLed.setToggle(LED_ON);
  }
}

void setup_wifi() {
  delay(10);
  Serial.println(String("Connecting to ") + ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}

/* MQTT subscribing callback */ //RICEZIONE MESSAGGIO
void callback(char* topic, byte* payload, unsigned int length) {
  scanDelay = 1000/F2;
  Serial.println(String("Message arrived on [") + topic + "] len: " + length );
  if (strncmp((char *)payload, "WLM-DATA-New frequency", 22) == 0) {
    if(payload[25] == '1') {
      scanDelay = 1000/F1;
    }
  }
}

void reconnect() {
  // Loop until we're reconnected
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    
    // Create a random client ID
    String clientId = String("esiot-2122-client-")+String(random(0xffff), HEX);

    // Attempt to connect
    if (client.connect(clientId.c_str())) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      // client.publish("outTopic", "hello world");
      // ... and resubscribe
      client.subscribe(topic);
      updateLedStates(true, true);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      updateLedStates(false, false);
      // Wait 5 seconds before retrying
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  setup_wifi();
  randomSeed(micros());
  client.setCallback(callback);

  scanDelay = 1000/F1;
}

void loop() {
  delay(scanDelay);
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  snprintf(msg, MSG_BUFFER_SIZE, "WLM-DATA-Current level: %g", sonar.getLevel());
  Serial.println(String("Sending data...") + msg);
  /* publishing the msg */
  client.publish(topic, msg);
}