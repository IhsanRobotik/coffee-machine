//this code uses core api instead of snap
const { spawn } = require('child_process');
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

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

const createPayment = async (input) => {
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
    console.log('Payment created successfully:', response.data);
    const qris_url = response.data.actions[0].url;
    const description = product[input].description;
    const price = product[input].price;
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
    console.log('Payment cancelled successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    return null;
  }
};

const checkPaymentStatus = async () => {
  const url = `https://api.sandbox.midtrans.com/v2/${transactionId}/status`;
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: authorization
    }
  };

  try {
    const response = await axios.get(url, options);
    return response.data;
  } catch (error) {
    console.error('Error checking payment status:', error);
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

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const monitorPaymentStatus = async () => {
  let paymentStatus = null;
  const settlement = 'settlement';
  const expire = 'expire';
  let isCancelled = false;

  ipcMain.once('cancel-payment', () => {
    isCancelled = true;
  });

  //skip wait logic
  while (paymentStatus !== settlement && !isCancelled && paymentStatus !== expire) {
    const statusResponse = await checkPaymentStatus();
    paymentStatus = statusResponse.transaction_status;
    console.log('Payment status:', paymentStatus);
    
    if (!isCancelled && paymentStatus !== settlement && paymentStatus !== expire) {
      for (let i = 0; i < 20; i++) { // Check every 100ms for a total of 2000ms
        if (isCancelled || paymentStatus === settlement || paymentStatus === expire) break;
        await wait(100);
      }
    }
  }

  if (isCancelled) {
    mainWindow.loadFile('./html/cancelled.html');
    cancelPayment();
    generateNewPayment();
    await wait(2000);
    mainWindow.loadFile('./html/index.html');
  } else if (paymentStatus === settlement) {
    runPythonScript('./python/ass.py', [100,23]);
    mainWindow.loadFile('./html/success.html'); 
    generateNewPayment();
    await wait(2000);
    mainWindow.loadFile('./html/index.html');
  } else if (paymentStatus === expire) { 
    mainWindow.loadFile('./html/expired.html')
    generateNewPayment();
    await wait(2000);
    mainWindow.loadFile('./html/index.html')
  } else {
    cancelPayment();
    generateNewPayment();
  }
};

function generateNewPayment() {
  transactionId = uuidv4();
  console.log('New transaction ID:', transactionId);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 700,
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
  if (product[input] && product[input].price>0) {
    createPayment(input).then(() => monitorPaymentStatus());
  } 
  else {
    console.log('Invalid input:', input);
    if (Number(input) === 69) {
      console.log('Exiting application...');
      app.quit();
    }
    if (Number(input) === 420) {
      console.log('modifying product data...');
      mainWindow.loadFile('./html/modify.html'); 
    }
    else{
      mainWindow.loadFile('./html/noProduct.html');
      setTimeout(() => {
        mainWindow.loadFile('./html/index.html');
      }, 2000);
    }
  }
});

ipcMain.on('modify-product', (event, { id, description, price }) => {
    if (product[id]) {
        product[id].description = description;
        product[id].price = parseInt(price, 10);
        fs.writeFileSync(productFilePath, JSON.stringify(product, null, 2));
        console.log(`Product ${id} modified successfully.`);
        mainWindow.webContents.send('modification-success', `Product ${id} modified successfully.`);
    } else {
        console.log(`Product ${id} not found.`);
        mainWindow.webContents.send('modification-failure', `Product ${id} not found.`);
    }
});

ipcMain.on('exit-application', () => {
  mainWindow.loadFile('./html/index.html');
});
