#include <Arduino.h>
#include "Potentiometer.hpp"

Potentiometer::Potentiometer() {
    this->potentiometerInPin = A0;
    this->potentiometerOutPin = 9;
    this->mapLow = 0;
    this->mapHigh = 255;
}

int Potentiometer::getValue() {
    uint8_t sensorValue = analogRead(this->potentiometerInPin);
    uint8_t outputValue = map(sensorValue, 0, 1023, this->mapLow, this->mapHigh);
    analogWrite(this->potentiometerOutPin, outputValue); 
    return outputValue;
}