const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    logInput: (input) => ipcRenderer.send('log-input', input),
    processPayment: (input) => ipcRenderer.send('process-payment', input),
    cancelPayment: () => ipcRenderer.send('cancel-payment'),
    modifyProduct: (id, description, price) => ipcRenderer.send('modify-product', { id, description, price }),
    exitApplication: () => ipcRenderer.send('exit-application'),
    onModificationSuccess: (callback) => ipcRenderer.on('modification-success', callback),
    onModificationFailure: (callback) => ipcRenderer.on('modification-failure', callback)
});