# Unibo IoT Assignment 3
## Task
### Smart river Monitoring
We want to realise an IoT system implementing a simplified version of a smart river monitoring system, as a system monitoring the water level of rivers and controlling related water channels. The system is composed of 4 subsystems:
IMAGE HERE

- Water Level Monitoring subsystem (based on ESP)
  - embedded system to monitor the water level of a river
  - It interacts with the River Monitoring Service subsystem (preferably via MQTT1 - HTTP can be used as a second option)
- River Monitoring Service subsystem  (backend - running on a PC server)
  - service functioning as the main unit governing the management of the smart river system 
  - it interacts through the serial line with the Controller 
  - it interacts via MQTT with the Water Level Monitoring
  - it interacts via HTTP with the Dashboard
- Water Channel Controller subsystem (Arduino)
  - embedded system controlling the gate/valve of a water channel 
  - it interacts via serial line with the River Monitoring System 
- River Monitoring Dashboard subsystem (Frontend/web app on the PC)
  - front-end to visualise and track the state of the river monitoring
  - it interacts with the River Monitoring Service 
