#ifndef BUTTON_CLASS
#define BUTTON_CLASS

class Button {

    private:
        uint8_t buttonPin;
        bool state;
    
    public:
        Button();
        virtual bool getCurrentState();
        virtual void updateState();
};

#endif