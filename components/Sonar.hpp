#ifndef SONAR_CLASS
#define SONAR_CLASS

class Sonar {

    private:
        int trigPin;
        int echoPin;
        float vs;
    
    public:
        Sonar() = delete;
        virtual float getLevel() = 0;
};

#endif