import subprocess
import numpy as np
import pvporcupine
from datetime import datetime
from vosk import Model, KaldiRecognizer
import json
import os
import time

timeout = 10
model_path = os.path.join(os.path.dirname(__file__), "vosk-model-small-en-us-0.15")
model = Model(model_path)
rec = KaldiRecognizer(model, 16000)

ACCESS_KEY = "d5q+qmW6dSHMOZafg0JakVidYjCdCji16Sr9M0HbTUEIKPxprbHJ3g=="
KEYWORD_PATH = "python/python_vosk/example/coffee_machine.ppn"
AUDIO_URL = "http://192.168.1.200:8080/audio.wav"

porcupine = pvporcupine.create(
    access_key=ACCESS_KEY,
    keyword_paths=[KEYWORD_PATH],
    sensitivities=[0.5]
)

ffmpeg_cmd = [
    'ffmpeg',
    '-i', AUDIO_URL,
    '-f', 's16le',
    '-acodec', 'pcm_s16le',
    '-ac', '1',
    '-ar', '16000',
    '-loglevel', 'quiet',
    '-'
]
pipe = subprocess.Popen(ffmpeg_cmd, stdout=subprocess.PIPE, bufsize=4096)

frame_len = porcupine.frame_length
sample_bytes = 2

def vosk_stream(pipe, timeout):
    start_time = time.time()
    buffer = b""
    while time.time() - start_time < timeout:
        chunk = pipe.stdout.read(1024)
        if len(chunk) == 0:
            break
        buffer += chunk
        while len(buffer) >= 4000:
            data = buffer[:4000]
            buffer = buffer[4000:]
            if rec.AcceptWaveform(data):
                result = rec.Result()
                text = json.loads(result).get("text", "")
                if "espresso" in text:
                    print("ESPRESSO_DETECTED", flush=True)
                if "cappuccino" in text:
                    print("CAPPUCCINO_DETECTED", flush=True)
                if "americano" in text:
                    print("AMERICANO_DETECTED", flush=True)
                if "milk" in text:
                    print("MILK_DETECTED", flush=True)
                if "water" in text:
                    print("WATER_DETECTED", flush=True)

while True:
    raw = pipe.stdout.read(frame_len * sample_bytes)
    if len(raw) < frame_len * sample_bytes:
        break
    pcm = np.frombuffer(raw, dtype=np.int16)
    result = porcupine.process(pcm)
    if result >= 0:
        vosk_stream(pipe, timeout)
