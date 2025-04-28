// Required modules
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const express = require('express');
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const { v4: uuidv4 } = require('uuid');
const { STATUS_CODES } = require('http');
const sha512 = require('js-sha512').sha512;

// Environment variables
require('dotenv').config();
const authorization = process.env.MIDTRANS_API_AUTH;
const Server_Key = process.env.MIDTRANS_SERVER_KEY;

// Constants
const productFilePath = path.join(__dirname, 'products.json');
const baseUrl = 'https://api.sandbox.midtrans.com/v2/charge';

// Global variables
let mainWindow;
let order_id;
let product = JSON.parse(fs.readFileSync(productFilePath, 'utf8'));

// Headers for API requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': authorization,
};

// Function to check active ngrok tunnels
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
    }
    return false;
  } catch (error) {
    console.error('Error fetching ngrok tunnels:', error.message);
    return false;
  }
}

// Function to monitor payment status
const monitorPayment = async (input) => {
  const expressApp = express();
  expressApp.use(express.json());

  expressApp.post('/midtrans/callback', (req, res) => {
    console.log('Received:', req.body);

    const hash = sha512(order_id + req.body.status_code + (product[input].price + '.00') + Server_Key);
    console.log(order_id, "_________", req.body.status_code, "_________", product[input].price + '.00', "_________", Server_Key);
    console.log('SHA-512 Hash:', hash);

    if (hash === req.body.signature_key) {
      console.log('Authorized callbacks.');
      if (req.body.transaction_status === 'settlement') {
        mainWindow.loadFile('./html/success.html');
        setTimeout(() => mainWindow.loadFile('./html/index.html'), 2000);
      } else if (req.body.transaction_status === 'expire') {
        mainWindow.loadFile('./html/expired.html');
        setTimeout(() => mainWindow.loadFile('./html/index.html'), 2000);
      } else if (req.body.transaction_status === 'cancel') {
        mainWindow.loadFile('./html/cancelled.html');
        setTimeout(() => mainWindow.loadFile('./html/index.html'), 2000);
      } else {
        console.log('Unhandled transaction status.');
      }
    } else {
      console.error('Unauthorized callback.');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    res.json({ message: 'Received' });
  });

  expressApp.listen(5000, () => console.log('Express server listening on port 5000'));
};

// Function to create a payment
const createPayment = async (input) => {
  const ngrokActive = await checkNgrokTunnels();
  if (!ngrokActive) {
    console.error('Cannot create payment: No active ngrok tunnels.');
    return;
  }

  order_id = uuidv4();
  const payload = {
    transaction_details: {
      order_id: order_id,
      gross_amount: product[input].price,
    },
    custom_expiry: {
      expiry_duration: 5,
      unit: 'minute',
    },
    merchantId: 'G536748043',
    payment_type: 'qris',
  };

  try {
    const response = await axios.post(baseUrl, payload, { headers });
    const qris_url = response.data.actions[0].url;
    const description = product[input].description;
    const price = product[input].price;

    console.log(qris_url);
    mainWindow.loadURL(`file://${__dirname}/html/qr.html?qris_url=${encodeURIComponent(qris_url)}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(price)}`);

    monitorPayment(input);
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

// Function to cancel a payment
const cancelPayment = async () => {
  const url = `https://api.sandbox.midtrans.com/v2/${order_id}/cancel`;

  try {
    const response = await axios.post(url, {}, { headers });
    return response.data;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return null;
  }
};

// Function to run a Python script
function runPythonScript(scriptPath, args) {
  const pyProg = spawn('python', [scriptPath, ...args]);

  let data = '';
  pyProg.stdout.on('data', (stdout) => {
    data += stdout.toString();
  });

  pyProg.stderr.on('data', (stderr) => {
    console.error(`stderr: ${stderr}`);
  });

  pyProg.on('close', (code) => {
    console.log(`Child process exited with code ${code}`);
    console.log(data);
  });
}

// Function to create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 1024,
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('./html/index.html');
}

// Electron app lifecycle events
app.whenReady().then(createWindow);

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

// IPC event handlers
ipcMain.on('log-input', (event, input) => {
  console.log('Entered:', input);
  createPayment(input);
});

ipcMain.on('cancel-payment', () => {
  cancelPayment();
  mainWindow.loadFile('./html/cancelled.html');
  setTimeout(() => mainWindow.loadFile('./html/index.html'), 2000);
});

ipcMain.on('exit-application', () => {
  mainWindow.loadFile('./html/index.html');
});
