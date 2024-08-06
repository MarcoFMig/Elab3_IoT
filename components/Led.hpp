#ifndef LED_CLASS
#define LED_CLASS

class Led {

    private:
        int ledPin;
        bool isOn;
    
    public:
        Led() = delete;
        virtual void setToggle(bool toggle) = 0;
};

#endif