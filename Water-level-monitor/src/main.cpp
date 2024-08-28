#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "Led.hpp"
#include "Sonar.hpp"

#define MINUTE (uint16_t) 60000
#define F1 (uint16_t) 6
#define F2 (uint16_t) 60
#define LED_ON true
#define LED_OFF false
#define LED_PIN_GREEN (uint8_t) 19
#define LED_PIN_RED (uint8_t) 5
#define MSG_BUFFER_SIZE  50
#define SONAR_ECHO_PIN (uint8_t) 2
#define SONAR_TRIGGER_PIN (uint8_t) 18

/* wifi network info */
const char* ssid = "INSERT WIFI SSID HERE"; //INSERISCI NOME RETE WI-FI
const char* password = "INSERT WIFI PASSWORD HERE"; //INSERISCI PASSWORD RETE WI-FI

/* MQTT topic */
const char* broker = "INSERT BROKER IP HERE";
const char* topic = "esiot-2023";

/* MQTT client management */
WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastMsgTime = 0;
char msg[MSG_BUFFER_SIZE];
int value = 0;
bool pongRequest = false;

Led greenLed = Led(LED_PIN_GREEN);
Led redLed = Led(LED_PIN_RED);
Sonar sonar = Sonar(SONAR_TRIGGER_PIN, SONAR_ECHO_PIN);
uint16_t scanDelay;

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
  Serial.println(String("Message arrived on [") + topic + "] len: " + length);
  if (strncmp((char *)payload, "RMS-CTRL-PING", 13) == 0) {
    pongRequest = true;
  } else {
    scanDelay = MINUTE/F2;
    if (strncmp((char *)payload, "RMS-DATA-SF", 11) == 0 && length < 14) {
      scanDelay = MINUTE/F1;
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
  client.setServer(broker, 1883);
  client.setCallback(callback);

  scanDelay = MINUTE/F1;
}

void loop() {
  delay(scanDelay);
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  if (pongRequest) {
    pongRequest = false;
    client.publish(topic, "WLM-CTRL-PONG");
  } else {
    snprintf(msg, MSG_BUFFER_SIZE, "WLM-DATA-WLI:%g", sonar.getLevel());
    Serial.println(String("Sending data...") + msg);
    /* publishing the msg */
    client.publish(topic, msg);
  }
}