#include <Arduino.h>
#include "Button.hpp"
#include "Potentiometer.hpp"
#include "LCDDisplay.hpp"

#define STATE_AUTO false
#define STATE_MANUAL true
#define ANGLE_0 0
#define ANGLE_25 45
#define ANGLE_50 90
#define ANGLE_100 180
#define BUF_SIZE 30

Button button = Button();
Potentiometer pot = Potentiometer();
LCDDisplay lcd = LCDDisplay();
char buffer[BUF_SIZE];
uint8_t angle;
uint8_t perc;

void setup() {
  Serial.begin(115200);
}

void loop() {
  if (button.getCurrentState() == STATE_AUTO) {
    Serial.readString().toCharArray(buffer, BUF_SIZE);
    if (strncmp(buffer, "Valve opening", 13)) {
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
        lcd.concat(F("AUTOMATIC"));
    }
  } else {
    perc = pot.getValue();
    angle = map(perc, 0, 100, 0, 180);
    snprintf(buffer, BUF_SIZE, "Valve opening: %hhu \%", perc);
    lcd.write(buffer);
    lcd.concat(F("MANUAL"));
  }
}