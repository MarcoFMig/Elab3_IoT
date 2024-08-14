#ifndef LCD_CLASS
#define LCD_CLASS

#include <LiquidCrystal_I2C.h>

class LCDDisplay {

    private:
        LiquidCrystal_I2C lcd;
        uint8_t curRow;
    
    public:
        LCDDisplay();
        virtual void write(const __FlashStringHelper * text);
        virtual void concat(const __FlashStringHelper * text);
};

#endif