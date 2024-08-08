#include <Arduino.h>
#include "Sonar.hpp"

Sonar::Sonar() {
    this->trigPin = 8;
    this->echoPin = 7;
    this->vs = 331.5 + 0.6*20;
    pinMode(this->trigPin, OUTPUT);
    pinMode(this->echoPin, INPUT);
}

float Sonar::getLevel() {
    /* sending impulse */
    digitalWrite(this->trigPin, LOW);
    delayMicroseconds(3);
    digitalWrite(this->trigPin, HIGH);
    delayMicroseconds(5);
    digitalWrite(this->trigPin, LOW);
    /* receiving the eco */
    float tUS = pulseIn(this->echoPin, HIGH);
    float t = tUS / 1000.0 / 1000.0 / 2;
    float d = t*this->vs;
    return d;
}