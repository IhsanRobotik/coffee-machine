import time
import gpiod

# GPIO chip and lines
chip = gpiod.Chip('gpiochip0')

TRIG_LINE = 17  # GPIO number for TRIG (change as per wiring)
ECHO_LINE = 18  # GPIO number for ECHO (change as per wiring)

trig = chip.get_line(TRIG_LINE)
echo = chip.get_line(ECHO_LINE)

# Request lines: TRIG as output, ECHO as input
trig.request(consumer='hcsr04', type=gpiod.LINE_REQ_DIR_OUT)
echo.request(consumer='hcsr04', type=gpiod.LINE_REQ_DIR_IN)

def measure_distance():
    # Ensure TRIG is low
    trig.set_value(0)
    time.sleep(0.0002)

    # Send 10us pulse on TRIG
    trig.set_value(1)
    time.sleep(0.00001)
    trig.set_value(0)

    # Wait for ECHO to go high
    start_time = time.time()
    timeout = start_time + 0.05
    while echo.get_value() == 0:
        if time.time() > timeout:
            return None

    pulse_start = time.time()

    # Wait for ECHO to go low
    timeout = pulse_start + 0.05
    while echo.get_value() == 1:
        if time.time() > timeout:
            return None

    pulse_end = time.time()

    pulse_duration = pulse_end - pulse_start

    # Calculate distance in cm (speed of sound = 34300 cm/s)
    distance = (pulse_duration * 34300) / 2

    return distance

if __name__ == '__main__':
    while True:
        dist = measure_distance()
        if dist is not None:
            print(f'Distance: {dist:.2f} cm')
        else:
            print('Measurement timeout')
        time.sleep(1)
