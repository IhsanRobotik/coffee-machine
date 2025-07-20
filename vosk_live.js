import vosk from 'vosk';
import fs from 'fs';
import http from 'http';
import wav from 'wav-decoder';

const MODEL_PATH = "model";
const SAMPLE_RATE = 16000;
const AUDIO_URL = "http://192.168.1.200:8080/audio.wav";

if (!fs.existsSync(MODEL_PATH)) {
    console.error("Model missing:", MODEL_PATH);
    process.exit(1);
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);
const rec = new vosk.Recognizer({ model: model, sampleRate: SAMPLE_RATE });

http.get(AUDIO_URL, res => {
    let chunks = [];

    res.on('data', chunk => chunks.push(chunk));

    res.on('end', async () => {
        const buffer = Buffer.concat(chunks);
        const decoded = await wav.decode(buffer);

        const audioData = decoded.channelData[0]; // mono channel
        const int16Array = new Int16Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
            int16Array[i] = audioData[i] * 32767;
        }

        const chunkSize = 4000;
        for (let i = 0; i < int16Array.length; i += chunkSize) {
            const chunk = Buffer.from(int16Array.slice(i, i + chunkSize).buffer);
            if (rec.acceptWaveform(chunk))
                console.log(rec.result());
            else
                console.log(rec.partialResult());
        }

        console.log(rec.finalResult());
        rec.free();
        model.free();
    });
}).on('error', err => {
    console.error("HTTP error:", err.message);
    rec.free();
    model.free();
});
