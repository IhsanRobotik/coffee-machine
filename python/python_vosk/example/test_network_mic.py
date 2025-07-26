import subprocess
import numpy as np
import pvporcupine

ACCESS_KEY = "d5q+qmW6dSHMOZafg0JakVidYjCdCji16Sr9M0HbTUEIKPxprbHJ3g=="
KEYWORD_PATH = "python/python_vosk/example/coffee_machine.ppn"

porcupine = pvporcupine.create(
    access_key=ACCESS_KEY,
    keyword_paths=[KEYWORD_PATH],
    sensitivities=[0.5]
)

# ffmpeg stream -> 16kHz mono s16le
ffmpeg_cmd = [
    'ffmpeg',
    '-i', 'http://10.147.100.229:8080/audio.wav',
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

print("Listening...")
try:
    while True:
        raw = pipe.stdout.read(frame_len * sample_bytes)
        if len(raw) < frame_len * sample_bytes:
            break
        pcm = np.frombuffer(raw, dtype=np.int16)
        result = porcupine.process(pcm)
        if result >= 0:


            
            print("Detected: coffee machine")
except KeyboardInterrupt:
    pass
finally:
    pipe.terminate()
    porcupine.delete()
