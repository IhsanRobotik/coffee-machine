const { spawn } = require('child_process');
const sensor = spawn('./python/hcsr04');

sensor.stdout.on('data', data => process.stdout.write(data));
sensor.stderr.on('data', data => process.stderr.write(data));
sensor.on('error', err => console.error('Spawn error:', err));
sensor.on('close', code => console.log('Process closed:', code));
