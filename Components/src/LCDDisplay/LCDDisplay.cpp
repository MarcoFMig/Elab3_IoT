#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include "LCDDisplay.hpp"

LCDDisplay::LCDDisplay() : lcd(0x27, 20, 4) {
    this->lcd.init();
    this->lcd.backlight();
}

void LCDDisplay::write(const __FlashStringHelper * text) {
    this->lcd.clear();
    this->lcd.print(text);
}