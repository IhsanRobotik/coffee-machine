import struct
from datetime import datetime
import pvporcupine
from pvrecorder import PvRecorder

ACCESS_KEY = "d5q+qmW6dSHMOZafg0JakVidYjCdCji16Sr9M0HbTUEIKPxprbHJ3g=="
KEYWORD_PATH = KEYWORD_PATH = "python/python_vosk/example/coffee_machine.ppn"
DEVICE_INDEX = http://10.147.100.229:8080/audio.wav

porcupine = pvporcupine.create(
    access_key=ACCESS_KEY,
    keyword_paths=[KEYWORD_PATH],
    sensitivities=[0.5]
)

recorder = PvRecorder(
    frame_length=porcupine.frame_length,
    device_index=DEVICE_INDEX
)
recorder.start()

print("Listening... (Ctrl+C to stop)")
try:
    while True:
        pcm = recorder.read()
        result = porcupine.process(pcm)
        if result >= 0:
            print(f"[{datetime.now()}] Detected: coffee machine")
except KeyboardInterrupt:
    print("Stopping...")
finally:
    recorder.stop()
    recorder.delete()
    porcupine.delete()
