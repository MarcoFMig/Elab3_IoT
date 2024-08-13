#ifndef POTENTIOMETER_CLASS
#define POTENTIOMETER_CLASS

class Potentiometer {

    private:
        uint8_t potentiometerInPin;
        uint8_t mapLow;
        uint8_t mapHigh;
    
    public:
        Potentiometer();
        virtual int getValue() = 0;
};

#endif