#include <Arduino.h>
#include <Servo.h>
#include "Button.hpp"
#include "Potentiometer.hpp"
#include "LCDDisplay.hpp"

#define STATE_AUTO false
#define STATE_MANUAL true
#define PIN_SERVO A1
#define ANGLE_0 0
#define ANGLE_25 45
#define ANGLE_50 90
#define ANGLE_100 180
#define BUF_SIZE 30

const char valveOpening[] PROGMEM = "Valve opening:";
const char automatic[] PROGMEM = "AUTOMATIC";
const char manual[] PROGMEM = "MANUAL";

Servo servo;
Button button = Button();
Potentiometer pot = Potentiometer();
LCDDisplay lcd = LCDDisplay();
String tmp;
char buffer[BUF_SIZE];
uint8_t angle;
uint8_t perc;

void setup() {
  Serial.begin(115200);
  servo.attach(PIN_SERVO);
}

void loop() {
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
        lcd.write(buffer);
        lcd.concat(automatic);
    }
  } else {
    perc = pot.getValue();
    angle = map(perc, 0, 100, 0, 180);
    snprintf(buffer, BUF_SIZE, "%s %hhu %c", valveOpening, perc, '%');
    lcd.write(buffer);
    lcd.concat(manual);
  }
  servo.write(angle);
  delay(1000);
}