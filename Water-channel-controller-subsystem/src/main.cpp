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

void LCDWrite(const char * text) {
    lcd.clear();
    lcd.print(text);
    curRow = 1;
}

void LCDConcat(const char * text) {
    if (curRow >= 4) {
        LCDWrite(text);
    } else {
        lcd.setCursor(0, curRow);
        lcd.print(text);
        curRow++;
    }
}

void LCDWrite(const __FlashStringHelper * text) {
    lcd.clear();
    lcd.print(text);
    curRow = 1;
}

void LCDConcat(const __FlashStringHelper * text) {
    if (curRow >= 4) {
        LCDWrite(text);
    } else {
        lcd.setCursor(0, curRow);
        lcd.print(text);
        curRow++;
    }
}

void setup() {
  Serial.begin(9600);
  lcd.init();
  lcd.backlight();
  servo.attach(PIN_SERVO);
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
  snprintf(buffer, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
  Serial.println(buffer);
  uint8_t len = strlen(buffer);
  while(Serial.availableForWrite() < len) {}
  uint8_t bytes = Serial.write(buffer);
  Serial.println(bytes);
  delay(3000);
  
  if (button.getCurrentState() == STATE_AUTO) {
    while (Serial.available() == 0) {}
    tmp = Serial.readString();
    strncpy(buffer, tmp.c_str(), BUF_SIZE);
    if (strncmp(buffer, valveOpening, 14) == 0) {
        switch (buffer[16])
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
        LCDWrite(buffer);
        LCDConcat(F("AUTOMATIC"));
    }
  } else {
    perc = pot.getValue();
    angle = map(perc, 0, 100, 0, 180);
    snprintf(buffer, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
    LCDWrite(buffer);
    LCDConcat(F("MANUAL"));
    uint8_t len = strlen(buffer);
    while(Serial.availableForWrite() < len) {}
    Serial.write(buffer);
  }
  servo.write(angle);
  delay(1000);
}
