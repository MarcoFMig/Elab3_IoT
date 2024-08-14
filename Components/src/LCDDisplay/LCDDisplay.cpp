#include <Arduino.h>
#include <LiquidCrystal_I2C.h>
#include "LCDDisplay.hpp"

LCDDisplay::LCDDisplay() : lcd(0x27, 20, 4) {
    this->lcd.init();
    this->lcd.backlight();
    this->curRow = 0;
}

void LCDDisplay::write(const __FlashStringHelper * text) {
    this->lcd.clear();
    this->lcd.print(text);
    this->curRow = 1;
}

void LCDDisplay::concat(const __FlashStringHelper * text) {
    if (this->curRow >= 4) {
        this->write(text);
    } else {
        this->lcd.setCursor(0, this->curRow);
        this->lcd.print(text);
        this->curRow++;
    }
}