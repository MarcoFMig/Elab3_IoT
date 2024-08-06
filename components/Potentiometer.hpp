#ifndef POTENTIOMETER_CLASS
#define POTENTIOMETER_CLASS

class Potentiometer {

    private:
        int potentiometerInPin;
        int potentiometerOutPin;
        int mapLow;
        int mapHigh;
    
    public:
        Potentiometer() = delete;
        virtual int getValue() = 0;
};

#endif