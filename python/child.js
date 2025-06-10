const { spawn } = require('child_process');

const sensor = spawn('./python/hell');

sensor.stdout.on('data', (data) => {
  console.log(`Distance output: ${data.toString()}`);
});

sensor.stderr.on('data', (data) => {
  console.error(`Error: ${data.toString()}`);
});

sensor.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});
