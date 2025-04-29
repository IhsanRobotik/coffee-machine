const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const express = require('express');
const expressApp = express(); 

let mainWindow;
let transactionId = uuidv4();

console.log('Payment settled:', transactionId);