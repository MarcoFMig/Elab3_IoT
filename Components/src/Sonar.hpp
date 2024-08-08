#ifndef SONAR_CLASS
#define SONAR_CLASS

class Sonar{

    private:
        int trigPin;
        int echoPin;
        float vs;
    
    public:
        Sonar();
        virtual float getLevel();
};

#endif