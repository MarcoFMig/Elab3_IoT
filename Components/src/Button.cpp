#include <Arduino.h>
#include "Button.hpp"

void Button::switchButtonState() {
    this->pressed = !this->pressed;
}

Button::Button() {
    this->buttonPin = 2;
    this->pressed = false;
    pinMode(this->buttonPin, INPUT);
    attachInterrupt(0, this->switchButtonState, RISING);
}

bool Button::isPressed() {
    return this->pressed;
}