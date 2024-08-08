#include <Arduino.h>
#include "Button.hpp"

uint8_t interruptPins[] = {2, 3};
uint8_t lastInterruptedPin = 0;

void interruptCall() {
    for (uint8_t i = 0; i < 2; i++) {
        if (digitalRead(interruptPins[i]) == HIGH) {
            lastInterruptedPin = interruptPins[i];
            break;
        }
    }
}

Button::Button() {
    this->buttonPin = 2;
    this->pressed = false;
    pinMode(this->buttonPin, INPUT);
    attachInterrupt(0, interruptCall, RISING);
}

bool Button::isPressed() {
    return this->pressed;
}

void Button::updateState() {
    if (lastInterruptedPin == this->buttonPin) {
        this->pressed = !this->pressed;
        lastInterruptedPin = 0;
    }
}