import queue
import sounddevice as sd
from vosk import Model, KaldiRecognizer
import json

q = queue.Queue()

def callback(indata, frames, time, status):
    if status:
        print(status)
    q.put(bytes(indata))
DEVICE_INDEX = 7
MODEL_PATH = "python/example/vosk-model-small-en-us-0.15"
SAMPLE_RATE = 16000

device_index = DEVICE_INDEX

model = Model(MODEL_PATH)
rec = KaldiRecognizer(model, SAMPLE_RATE)

with sd.RawInputStream(samplerate=SAMPLE_RATE, blocksize=8000, device=device_index,
                       dtype="int16", channels=1, callback=callback):
    while True:
        data = q.get()
        if rec.AcceptWaveform(data):
            print(json.loads(rec.Result())["text"])
        else:
            print(json.loads(rec.PartialResult())["partial"])
