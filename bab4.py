import subprocess
import threading

def read_stream(stream, label):
    for line in stream:
        print(f"{label}: {line.strip()}")

process = subprocess.Popen(
    ["./rpi5-sensor-actuator/bin/pump_dispense"],
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

threading.Thread(target=read_stream, args=(process.stdout, "STDOUT"), daemon=True).start()
threading.Thread(target=read_stream, args=(process.stderr, "STDERR"), daemon=True).start()

process.wait()
