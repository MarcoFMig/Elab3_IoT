#ifndef SONAR_CLASS
#define SONAR_CLASS

class Sonar {

    private:
        uint8_t trigPin;
        uint8_t echoPin;
        float vs;
    
    public:
        Sonar(uint8_t trigPin, uint8_t echoPin);
        virtual float getLevel();
};

#endif