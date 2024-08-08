#include <Arduino.h>
#include "Button.hpp"

void switchButtonState(Button button) {
    button->pressed = !button->pressed;
}

Button::Button() {
    this->buttonPin = 2;
    this->pressed = false;
    this->f_press_button = std::bind(switchButtonState, this);
    pinMode(this->buttonPin, INPUT);
    attachInterrupt(0, this->f_press_button, RISING);
}

bool Button::isPressed() {
    return this->pressed;
}