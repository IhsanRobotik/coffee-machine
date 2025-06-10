#!/bin/bash

# GPIO pin numbers (BCM numbering)
TRIG=17  # GPIO17
ECHO=18  # GPIO18

# Export GPIOs using libgpiod
CHIP="gpiochip0"

# Set TRIG as output and ECHO as input
gpiodetect | grep -q "$CHIP" || { echo "$CHIP not found"; exit 1; }

# Send trigger pulse
gpioset $CHIP $TRIG=0
sleep 0.05
gpioset $CHIP $TRIG=1
sleep 0.001
gpioset $CHIP $TRIG=0

# Read echo pin timing using gpioget + polling
START_TIME=0
END_TIME=0

# Wait for ECHO to go high
for i in {1..10000}; do
    [ "$(gpioget $CHIP $ECHO)" -eq 1 ] && START_TIME=$(date +%s%N) && break
    sleep 0.001
done

# Wait for ECHO to go low
for i in {1..10000}; do
    [ "$(gpioget $CHIP $ECHO)" -eq 0 ] && END_TIME=$(date +%s%N) && break
    sleep 0.001
done

# Calculate duration in microseconds
if [[ $START_TIME -gt 0 && $END_TIME -gt $START_TIME ]]; then
    DURATION=$(( (END_TIME - START_TIME) / 1000 ))
    DISTANCE_CM=$(echo "$DURATION / 58.0" | bc -l)
    printf "Distance: %.2f cm\n" "$DISTANCE_CM"
else
    echo "Measurement timeout"
fi
