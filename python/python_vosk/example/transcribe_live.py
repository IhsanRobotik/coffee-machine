import sys
import queue
import soundfile as sf
from vosk import Model, KaldiRecognizer
import json
import os

model_path = os.path.join(os.path.dirname(__file__), "vosk-model-small-en-us-0.15")
model = Model(model_path)
rec = KaldiRecognizer(model, 16000)

while True:
    data = sys.stdin.buffer.read(4000)
    if len(data) == 0:
        break
    if rec.AcceptWaveform(data):
        result = rec.Result()
        print(result)
        text = ""
        try:
            text = json.loads(result).get("text", "")
        except Exception:
            pass
        if "espresso" in text:
            print("COFFEE_DETECTED", flush=True) 
        if "cappuccino" in text:
            print("CAPPUCCINO_DETECTED", flush=True)
        if "americano" in text:
            print("AMERICANO_DETECTED", flush=True)
        if "milk" in text:
            print("MILK_DETECTED", flush=True)
        if "water" in text:
            print("WATER_DETECTED", flush=True)
    else:
        print(rec.PartialResult())