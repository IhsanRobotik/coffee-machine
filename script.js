document.addEventListener('DOMContentLoaded', () => {
    const display = document.getElementById('display');
    const keys = document.querySelectorAll('.key');
    const cancelButton = document.getElementById('cancel-button');

    keys.forEach(key => {
        key.addEventListener('click', () => {
            const keyValue = key.getAttribute('data-key');
            if (key.classList.contains('clear')) {
                display.value = '';
            } else if (key.classList.contains('enter')) {
                window.electronAPI.logInput(display.value);
                window.electronAPI.processPayment(display.value);
                display.value = '';
            } else {
                display.value += keyValue;
            }
        });
    });

    if (cancelButton) {
        cancelButton.addEventListener('click', () => {
            window.electronAPI.cancelPayment();
        });
    }
});