#ifndef BUTTON_CLASS
#define BUTTON_CLASS

class Button {

    private:
        int buttonPin;
        bool pressed;
    
    public:
        Button() = delete;
        virtual void switchButtonState() = 0;
        virtual bool isPressed() = 0;
};

#endif