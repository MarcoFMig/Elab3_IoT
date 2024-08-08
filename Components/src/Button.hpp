#ifndef BUTTON_CLASS
#define BUTTON_CLASS

class Button {

    private:
        int buttonPin;
        bool pressed;
        void (*switchStateWrap)();
    
    public:
        Button() = delete;
        virtual bool isPressed() = 0;
        virtual void updateState() = 0;
};

#endif