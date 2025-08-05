process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

// buat fitur pre order jarak jauh 
// ngrok ngrok http --url=relaxing-natural-eagle.ngrok-free.app 5000
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron'); 
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const express = require('express');
const expressApp = express(); 
const SHA512 = require('js-sha512');

let mainWindow;
let transactionId;
let price; 
let lastInput

const productFilePath = path.join(__dirname, 'products.json');
let product = JSON.parse(fs.readFileSync(productFilePath, 'utf8'));

require('dotenv').config();
const authorization = process.env.MIDTRANS_API_AUTH;
const ServerKey = process.env.MIDTRANS_SERVER_KEY;

// const authorization = process.env.MIDTRANS_API_AUTH_PROD;
// const ServerKey = process.env.MIDTRANS_SERVER_KEY_PROD;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': authorization
};

async function checkNgrokTunnels() {
  try {
    const response = await axios.get('http://127.0.0.1:4040/api/tunnels');
    const tunnels = response.data.tunnels;
    if (tunnels.length > 0) {
      console.log('Active ngrok tunnels:');
      for (const tunnel of tunnels) {
        console.log(`Public URL: ${tunnel.public_url} -> Local Address: ${tunnel.config.addr}`);
        if (tunnel.config.addr === 'http://localhost:5000' && tunnel.public_url === 'https://relaxing-natural-eagle.ngrok-free.app') {
          return true; 
        }
      }
    } else {
      console.log('No active ngrok tunnels found.');
      return false; 
    }
  } catch (error) {
    console.error('Error fetching ngrok tunnels:', error.message);
    return false; 
  }
}

const monitorpayment = async () => {
  expressApp.use(express.json()); 

  expressApp.post('/midtrans/callback', (req, res) => {
    console.log('Received:', req.body);

    // Verify the order_id matches the current transactionId
    const hash = SHA512(transactionId + req.body.status_code + price + '.00' + ServerKey);
    console.log(transactionId, '-----', req.body.status_code, '-----', price + '.00', '-----', ServerKey, hash);

    if (hash !== req.body.signature_key) {
      console.error('Order ID mismatch. Possible unauthorized callback.');
      return res.status(400).json({ message: 'hi' });
    }

    if (req.body.transaction_status === 'settlement') {
      mainWindow.loadFile('./html/success.html');
      setTimeout(() => {
        mainWindow.loadFile('./html/index.html');
      }, 2000);

    } else if (req.body.transaction_status === 'expire') {
      mainWindow.loadFile('./html/expired.html');
      setTimeout(() => {
        mainWindow.loadFile('./html/index.html');
      }, 2000);

    } else {
      console.log('-------------------------------------------------------------');
    }

    res.json({ message: 'received' });
  });

  expressApp.listen(5000, () => console.log('Server running on port 5000'));
};

const createPayment = async (input) => {
  // Check ngrok tunnels before proceeding
  // const ngrokActive = await checkNgrokTunnels();
  // if (!ngrokActive) {
  //   console.error('Cannot create payment: No active ngrok tunnels.');
  //   return; 
  // }
  price = product[input].price; 
  console.log(price, "sex")
  transactionId = uuidv4();
  const payload = {
    "transaction_details": {
      "order_id": transactionId,
      "gross_amount": price
    },
    "custom_expiry": {
      "expiry_duration": 5,
      "unit": "minute"
    },
    "merchantId": "G536748043",
    "payment_type": "qris"
  };

  const baseUrl = 'https://api.sandbox.midtrans.com/v2/charge';
  // const baseUrl = 'https://api.midtrans.com/v2/charge'


  try {
    const response = await axios.post(baseUrl, payload, { headers });
    const qris_url = response.data.actions[0].url;
    const description = product[input].description;
    console.log(qris_url);

    // Load the qris_url, description, and price in the main window
    mainWindow.loadURL(`file://${__dirname}/html/qr.html?qris_url=${encodeURIComponent(qris_url)}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(price)}`);
    
  } catch (error) {
    if (error.response) {
      console.error('Error creating payment:', error.response.data);
      console.error('Response Code:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
  }
};

const cancelPayment = async () => {
  const url = `https://api.sandbox.midtrans.com/v2/${transactionId}/cancel`;
  const options = {
    method: 'POST',
    headers: {
      accept: 'application/json',
      Authorization: authorization
    }
  };

  try {
    const response = await axios.post(url, {}, options);
    return response.data;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return null;
  }
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 1024,
    frame: false,
    resizable: false,
    fullscreen: true,
    cursor: 'none',
    kiosk: true,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('./html/index.html');
}

app.whenReady().then(() => {
  createWindow();
  listenForCoffeeCommand();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.on('log-input', (event, input) => {
  const coffeeName = product[input].description;
  console.log('Entered:', coffeeName);
  lastInput = input;
  mainWindow.loadFile('./html/adjust2.html').then(() => {
    mainWindow.webContents.send('set-coffee-name', coffeeName);
  });
});

ipcMain.on('cancel-payment', () => {
  cancelPayment();
  mainWindow.loadFile('./html/cancelled.html');
  setTimeout(() => {
    mainWindow.loadFile('./html/index.html');
  }, 2000); 
});

ipcMain.on('exit-application', () => {
  mainWindow.loadFile('./html/index.html');
});

ipcMain.on('adjust-preference', (event, values) => {
  console.log('Received preferences:', values);

  console.log('Received preferences:', values);
  console.log('input:', lastInput);

  // console.log (input.description)

  // turnOffHeating();

  // Get the selected product using lastInput as key
  const selectedProduct = product[lastInput];
  if (!selectedProduct) {
    console.error('Product not found for input:', lastInput);
    return;
  }

  // // Parse ingredient values as numbers
  const coffee = Number(selectedProduct.coffee || 0);
  const sugar = Number(selectedProduct.sugar || 0);
  const creamer = Number(selectedProduct.creamer || 0);
  const water = Number(selectedProduct.water || 0);
  // const price = Number(selectedProduct.price || 0);
  console.log({ coffee, sugar, creamer, water, price});
  
  price = product[lastInput].price; 
  createPayment(lastInput);	
  monitorpayment();

  //turnOffHeating();

});

function dispense(coffee, sugar, creamer, water) {
    mainWindow.loadFile('./html/dispensing.html').then(() => {
        const proc = spawn('./rpi5-sensor-actuator/bin/pump_dispense');

        proc.stdin.write(`${coffee} ${sugar} ${creamer} ${water}\n`);
        proc.stdin.end();

        proc.stdout.on('data', data => {
            const text = data.toString();
            console.log('stdout:', text);
            // process.stdout.write(text);
          const lines = data.toString().split('\n');
          for (const line of lines) {
            if (line.trim().startsWith('step:')) {
              const step = line.trim().replace('step:', '').trim();
              mainWindow.webContents.send('update-step', step);
            }
          }
        });

        proc.stderr.on('data', data => process.stderr.write(data));
        proc.on('close', code => {
          console.log('done');
          mainWindow.loadFile('./html/index.html');
        });

    });
}

// function turnOnHeating() {
//   // Spawns the toggle_29_high binary as a child process
//   const proc = spawn('./rpi5-sensor-actuator/bin/toggle_29_high');

//   proc.stdout.on('data', data => process.stdout.write(data));
//   proc.stderr.on('data', data => process.stderr.write(data));

//   proc.on('close', code => {
//     console.log('toggle_29_high process exited with code', code);
//   });
// }

// function turnOffHeating() {
//   // Spawns the toggle_29_low binary as a child process
//   const proc = spawn('./rpi5-sensor-actuator/bin/toggle_29_low');

//   proc.stdout.on('data', data => process.stdout.write(data));
//   proc.stderr.on('data', data => process.stderr.write(data));

//   proc.on('close', code => {
//     console.log('toggle_29_low process exited with code', code);
//   });
// }

function listenForCoffeeCommand() {
  const py = spawn(
    'sh',
    [
      '-c',
      'python3 python/python_vosk/example/complete_voice_rec.py'
    ],
    { cwd: path.resolve(__dirname) }
  );


  py.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    if (output.includes('ESPRESSO_DETECTED')) { 
      createPayment(2);
      // amount = getProductDetails(2);
      // console.log (amount);
      // dispense(amount.coffee, amount.sugar, amount.creamer, amount.water);
    }
    //   // product = coffee
    //   //display preference pafe
    // }
    // if (output.includes('CAPPUCCINO_DETECTED')) {
    //   amount = getProductDetails(1);
    //   console.log (amount);
    //   dispense(amount.coffee, amount.sugar, amount.creamer, amount.water);
    // }
    // if (output.includes('AMERICANO_DETECTED')) {
    //   amount = getProductDetails(4);
    //   console.log (amount);
    //   dispense(amount.coffee, amount.sugar, amount.creamer, amount.water);
    // }
    // if (output.includes('MILK_DETECTED')) {
    //   amount = getProductDetails(5);
    //   console.log (amount);
    //   dispense(amount.coffee, amount.sugar, amount.creamer, amount.water);
    // }
    // if (output.includes('WATER_DETECTED')) {
    //   amount = getProductDetails(6);
    //   console.log (amount);
    //   dispense(amount.coffee, amount.sugar, amount.creamer, amount.water);
    // }
    // if (output.includes('SUGAR_FREE

  });

  py.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write('[PYTHON STDERR]: ');
    process.stderr.write(output);
  });

  py.on('close', (code) => {
    console.log(`Python process exited with code ${code}`);
  });
}

function getProductDetails (lastInput) {

  const selectedProduct = product[lastInput];
  if (!selectedProduct) {
    console.error('Product not found for input:', lastInput);
    return;
  }

  // // Parse ingredient values as numbers
  const coffee = Number(selectedProduct.coffee || 0);
  const sugar = Number(selectedProduct.sugar || 0);
  const creamer = Number(selectedProduct.creamer || 0);
  const water = Number(selectedProduct.water || 0);
  const price = Number(selectedProduct.price || 0);
  console.log({ coffee, sugar, creamer, water, price});
  return { coffee, sugar, creamer, water, price };
  
}
