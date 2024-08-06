#include <Arduino.h>
#include "Led.hpp"

Led::Led() {
    this->ledPin = 13;
    this->isOn = false;
    pinMode(this->ledPin, OUTPUT);
}

void Led::setToggle(bool toggle) {
    this->isOn = toggle;
    digitalWrite(this->ledPin, toggle ? HIGH : LOW);
}