#ifndef LED_CLASS
#define LED_CLASS

class Led {

    private:
        int ledPin;
        bool isOn;
    
    public:
        Led();
        virtual void setToggle(bool toggle);
};

#endif