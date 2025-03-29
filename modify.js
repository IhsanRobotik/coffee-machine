document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('modify-form');
    const exitButton = document.getElementById('exit-button');
    const container = document.querySelector('.container');

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        const productId = document.getElementById('product-id').value;
        const description = document.getElementById('product-description').value;
        const price = document.getElementById('product-price').value;

        window.electronAPI.modifyProduct(productId, description, price);
    });

    exitButton.addEventListener('click', () => {
        window.electronAPI.exitApplication();
    });

    window.electronAPI.onModificationSuccess((event, message) => {
        container.innerHTML = `<h1>${message}</h1>`;
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });

    window.electronAPI.onModificationFailure((event, message) => {
        container.innerHTML = `<h1>${message}</h1>`;
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    });
});