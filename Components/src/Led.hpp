#ifndef LED_CLASS
#define LED_CLASS

class Led {

    private:
        uint8_t ledPin;
        bool isOn;
    
    public:
        Led();
        virtual void setToggle(bool toggle);
};

#endif