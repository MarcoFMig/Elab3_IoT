#include <Arduino.h>
#include "Led.hpp"

Led::Led(uint8_t pin) {
    this->ledPin = pin;
    this->isOn = false;
    pinMode(this->ledPin, OUTPUT);
}

void Led::setToggle(bool toggle) {
    this->isOn = toggle;
    digitalWrite(this->ledPin, toggle ? HIGH : LOW);
}