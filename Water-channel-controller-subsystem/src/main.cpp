#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include "Button.hpp"
#include "Potentiometer.hpp"

#define STATE_AUTO false
#define STATE_MANUAL true
#define PIN_SERVO 11
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
uint8_t byteBuffer[2];
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

uint8_t *formatDataMessage(uint8_t perc) {
    byteBuffer[0] = 0x02; // sendDataPrefix 0x4000
    byteBuffer[1] = perc;
    return byteBuffer;
}

bool checkReceivedMessage() {
    return (byteBuffer[0] & 0x06) == 0x06; // check for dataPrefix 0xC0
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
  snprintf(general.simpleStr, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
  LCDWrite(general);
  LCDConcat(button.getCurrentState() ? manual : automatic);
}

void loop() {
  button.updateState();
  if (button.getCurrentState() == STATE_AUTO) {
    if (Serial.available() >= 2) {
        Serial.readBytes(byteBuffer, 2);
        if (checkReceivedMessage()) {
            perc = byteBuffer[1];
        }
    }
  } else {
    perc = pot.getValue();
  }
  angle = map(perc, 0, 100, 0, 180);
  snprintf(general.simpleStr, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
  LCDWrite(general);
  LCDConcat(button.getCurrentState() ? manual : automatic);
  while((unsigned long long) Serial.availableForWrite() < sizeof(uint16_t)) {}
  Serial.write(formatDataMessage(perc), 2);
  servo.write(angle);
  delay(1000);
}
