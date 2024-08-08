#ifndef BUTTON_CLASS
#define BUTTON_CLASS

#include <functional>

void switchButtonState(Button);

class Button {

    private:
        int buttonPin;
        bool pressed;
        std::function<void()> f_press_button;
    
    public:
        Button() = delete;
        virtual bool isPressed() = 0;
};

#endif