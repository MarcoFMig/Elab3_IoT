#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include <Servo.h>
#include "Button.hpp"
#include "Potentiometer.hpp"

#define STATE_AUTO false
#define STATE_MANUAL true
#define PIN_SERVO A5
#define ANGLE_0 0
#define ANGLE_25 45
#define ANGLE_50 90
#define ANGLE_100 180
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
  snprintf(general.simpleStr, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
  Serial.println(general.simpleStr);
  uint8_t len = strlen(general.simpleStr);
  while(Serial.availableForWrite() < len) {}
  uint8_t bytes = Serial.write(general.simpleStr);
  Serial.println(bytes);
  delay(3000);
  
  if (button.getCurrentState() == STATE_AUTO) {
    while (Serial.available() == 0) {}
    tmp = Serial.readString();
    strncpy(general.simpleStr, tmp.c_str(), BUF_SIZE);
    if (strncmp(general.simpleStr, valveOpening, 14) == 0) {
        switch (general.simpleStr[16])
        {
            case 0:
                angle = ANGLE_0;
                break;
            case 2:
                angle = ANGLE_25;
                break;
            case 5:
                angle = ANGLE_50;
                break;
            case 1:
                angle = ANGLE_100;
                break;
        }
        Serial.println(angle);
        LCDWrite(general);
        LCDConcat(automatic);
    }
  } else {
    perc = pot.getValue();
    angle = map(perc, 0, 100, 0, 180);
    snprintf(general.simpleStr, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
    LCDWrite(general);
    LCDConcat(manual);
    uint8_t len = strlen(general.simpleStr);
    while(Serial.availableForWrite() < len) {}
    Serial.write(general.simpleStr);
  }
  servo.write(angle);
  delay(1000);
}
