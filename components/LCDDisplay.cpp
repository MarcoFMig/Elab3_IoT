#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include "LCDDisplay.hpp"

LCDDisplay::LCDDisplay() {
    this->lcd = LiquidCrystal_I2C(0x20, 16, 2);
    this->lcd.init();
    this->lcd.clear();
    this->lcd.backlight();
}

void LCDDisplay::displayInfo(bool mode, int angle) {
    this->lcd.clear();
    this->lcd.home();
    this->lcd.print("Mode: " + mode ? "Manual" : "Auto");
}