#include <Arduino.h>
#include "Potentiometer.hpp"

Potentiometer::Potentiometer() {
    this->potentiometerInPin = A0;
    this->mapLow = 0;
    this->mapHigh = 100;
}

uint8_t Potentiometer::getValue() {
    uint16_t sensorValue = analogRead(this->potentiometerInPin);
    uint8_t outputValue = map(sensorValue, 0, 1023, this->mapLow, this->mapHigh);
    return outputValue;
}