const { contextBridge, ipcRenderer } = require('electron');

let startY = null;
const threshold = 20; // minimum px to trigger scroll

window.addEventListener('pointerdown', e => {
  startY = e.clientY;
});

window.addEventListener('pointerup', e => {
  if (startY === null) return;
  const deltaY = e.clientY - startY;
  if (Math.abs(deltaY) > threshold) {
    // invert delta to match natural scroll
    window.scrollBy({ top: -deltaY, behavior: 'smooth' });
  }
  startY = null;
});


contextBridge.exposeInMainWorld('electronAPI', {
    logInput: (input) => ipcRenderer.send('log-input', input),
    processPayment: (input) => ipcRenderer.send('process-payment', input),
    cancelPayment: () => ipcRenderer.send('cancel-payment'),
    modifyProduct: (id, description, price) => ipcRenderer.send('modify-product', { id, description, price }),
    exitApplication: () => ipcRenderer.send('exit-application'),
    onModificationSuccess: (callback) => ipcRenderer.on('modification-success', callback),
    onModificationFailure: (callback) => ipcRenderer.on('modification-failure', callback)
});