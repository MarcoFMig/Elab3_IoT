#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include "Button.hpp"
#include "Potentiometer.hpp"

#define STATE_AUTO false
#define STATE_MANUAL true
#define PIN_SERVO A5
#define BUF_SIZE 30

typedef struct {
    bool isEfficient;
    char *simpleStr;
    const __FlashStringHelper *efficientStr;
} STRING_WRAP;

const char valveOpening[] = "Valve opening:";

Servo servo = Servo();
Button button = Button();
Potentiometer pot = Potentiometer();
LiquidCrystal_I2C lcd = LiquidCrystal_I2C(0x27, 20, 4);

String tmp;
char buffer[BUF_SIZE];
uint8_t receivedBytes[2];
uint8_t angle;
uint8_t curRow;
uint8_t perc = 0;

STRING_WRAP general;
STRING_WRAP automatic;
STRING_WRAP manual;

void LCDWrite(STRING_WRAP wrapper) {
    lcd.clear();
    if (wrapper.isEfficient) {
        lcd.print(wrapper.efficientStr);
    } else {
        lcd.print(wrapper.simpleStr);
    }
    
    curRow = 1;
}

void LCDConcat(STRING_WRAP wrapper) {
    if (curRow < 4) {
        lcd.setCursor(0, curRow);
        if (wrapper.isEfficient) {
            lcd.print(wrapper.efficientStr);
        } else {
            lcd.print(wrapper.simpleStr);
        }
        curRow++;
    }
}

uint16_t formatDataMessage(uint8_t perc) {
    uint16_t message = 0x0200; // sendDataPrefix 0x4000
    uint16_t tmp = perc;
    return message | tmp;
}

bool checkReceivedMessage() {
    return (receivedBytes[0] & 0x06) == 0x06; // check for dataPrefix 0xC0
}

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  servo.attach(PIN_SERVO);
  general.isEfficient = false;
  general.simpleStr = buffer;
  automatic.isEfficient = true;
  automatic.efficientStr = F("AUTOMATIC");
  manual.isEfficient = true;
  manual.efficientStr = F("MANUAL");
  /*
  Serial.println("Swipe");
  lcd.noDisplay();
  servo.write(0);
  delay(3000);
  servo.write(180);
  Serial.println(servo.read());
  lcd.display();
  */
}

void loop() {
  if (button.getCurrentState() == STATE_AUTO) {
    while (Serial.available() == 0) {}
    Serial.readBytes(receivedBytes, 2);
    if (checkReceivedMessage()) {
        perc = receivedBytes[1];
    }
  } else {
    perc = pot.getValue();
  }
  angle = map(perc, 0, 100, 0, 180);
  snprintf(general.simpleStr, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
  LCDWrite(general);
  LCDConcat(button.getCurrentState() ? manual : automatic);
  while((unsigned long long) Serial.availableForWrite() < sizeof(uint16_t)) {}
  Serial.write(formatDataMessage(perc));
  servo.write(angle);
  delay(1000);
}
