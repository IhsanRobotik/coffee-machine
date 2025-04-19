const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron'); // Electron app
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const express = require('express');
const expressApp = express(); // Rename the express app variable

let mainWindow;
let transactionId = uuidv4();

const productFilePath = path.join(__dirname, 'products.json');
let product = JSON.parse(fs.readFileSync(productFilePath, 'utf8'));

require('dotenv').config();
const authorization = process.env.MIDTRANS_API_AUTH;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': authorization
};

const monitorpayment = async () => {
  expressApp.use(express.json()); // Use expressApp instead of app

  expressApp.post('/midtrans/callback', (req, res) => {
    console.log('Received:', req.body);

    // Verify the order_id matches the current transactionId
    if (req.body.order_id !== transactionId) {
      console.error('Order ID mismatch. Possible unauthorized callback.');
      return res.status(400).json({ message: 'hi' });
    }

    // Check the transaction status
    if (req.body.transaction_status === 'settlement') {
      // Load success.html in the main window
      mainWindow.loadFile('./html/success.html');
      setTimeout(() => {
        mainWindow.loadFile('./html/index.html');
      }, 2000);

    } else if (req.body.transaction_status === 'expire') {
      // Load expired.html in the main window
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
  // Generate a unique transaction ID using uuid
  transactionId = uuidv4(); // Update the transactionId variable
  const payload = {
    "transaction_details": {
      "order_id": transactionId,
      "gross_amount": product[input].price
    },
    "custom_expiry": {
      "expiry_duration": 5,
      "unit": "minute"
    },
    "merchantId": "G536748043",
    "payment_type": "qris"
  };

  const baseUrl = 'https://api.sandbox.midtrans.com/v2/charge';

  try {
    const response = await axios.post(baseUrl, payload, { headers });
    // console.log('Payment created successfully:', response.data);
    const qris_url = response.data.actions[0].url;
    const description = product[input].description;
    const price = product[input].price;
    console.log(qris_url);

    // Load the qris_url, description, and price in the main window
    mainWindow.loadURL(`file://${__dirname}/html/qr.html?qris_url=${encodeURIComponent(qris_url)}&description=${encodeURIComponent(description)}&price=${encodeURIComponent(price)}`);

    monitorpayment();
    
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
    // console.log('Payment cancelled successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return null;
  }
};

// Run a Python script and return output
function runPythonScript(scriptPath, args) {

  // Use child_process.spawn method from 
  // child_process module and assign it to variable
  const pyProg = spawn('python', [scriptPath].concat(args));

  // Collect data from script and print to console
  let data = '';
  pyProg.stdout.on('data', (stdout) => {
    data += stdout.toString();
  });

  // Print errors to console, if any
  pyProg.stderr.on('data', (stderr) => {
    console.log(`stderr: ${stderr}`);
  });

  // When script is finished, print collected data
  pyProg.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    console.log(data);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 600,
    // frame: false, // Makes the window frameless (hides title bar, minimize, maximize, and close buttons)
    webPreferences: {
      preload: path.join(__dirname, 'renderer.js'),
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('./html/index.html');
}

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

ipcMain.on('log-input', (event, input) => {
  console.log('Entered:', input);
  createPayment(input);
});

ipcMain.on('cancel-payment', () => {
  cancelPayment();
  mainWindow.loadFile('./html/cancelled.html');
  setTimeout(() => {
    mainWindow.loadFile('./html/index.html');
  }, 2000); // Show cancel.html for 2 seconds
});

ipcMain.on('exit-application', () => {
  mainWindow.loadFile('./html/index.html');
});
