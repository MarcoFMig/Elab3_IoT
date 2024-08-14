#ifndef POTENTIOMETER_CLASS
#define POTENTIOMETER_CLASS

class Potentiometer {

    private:
        uint8_t potentiometerInPin;
        uint8_t mapLow;
        uint8_t mapHigh;
    
    public:
        Potentiometer();
        virtual uint8_t getValue();
};

#endif