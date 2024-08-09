#ifndef BUTTON_CLASS
#define BUTTON_CLASS

class Button {

    private:
        uint8_t buttonPin;
        bool pressed;
    
    public:
        Button() = delete;
        virtual bool isPressed() = 0;
        virtual void updateState() = 0;
};

#endif