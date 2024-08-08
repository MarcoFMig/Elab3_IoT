#ifndef LCD_CLASS
#define LCD_CLASS

#include <LiquidCrystal_I2C.h>

class LCDDisplay {

    private:
        LiquidCrystal_I2C lcd;
    
    public:
        LCDDisplay();
        virtual void write(const __FlashStringHelper * text);
};

#endif