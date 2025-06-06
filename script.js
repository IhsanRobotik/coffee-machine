document.addEventListener('DOMContentLoaded', () => {
    let startY = null;
    let lastY = null;

    window.addEventListener('pointerdown', e => {
        startY = e.clientY;
        lastY = e.clientY;
    });

    window.addEventListener('pointermove', e => {
        if (startY === null) return;
        const deltaY = e.clientY - lastY;
        window.scrollBy({ top: -deltaY });
        lastY = e.clientY;
    });

    window.addEventListener('pointerup', () => {
        startY = null;
        lastY = null;
    });

    const coffeeList = document.getElementById('coffeeList');
    fetch('../products.json')
        .then(response => response.json())
        .then(data => {
            Object.keys(data).forEach(key => {
                const coffee = data[key];
                const coffeeItem = document.createElement('div');
                coffeeItem.classList.add('coffee-item');

                const coffeeImage = document.createElement('img');
                coffeeImage.src = coffee.imagePath;
                coffeeImage.dataset.index = key;
                coffeeImage.alt = coffee.description;

                let downY = null;
                let isDragging = false;

                coffeeImage.addEventListener('pointerdown', e => {
                    downY = e.clientY;
                    isDragging = false;
                });

                coffeeImage.addEventListener('pointermove', e => {
                    if (downY === null) return;
                    if (Math.abs(e.clientY - downY) > 5) {
                        isDragging = true;
                    }
                });

                coffeeImage.addEventListener('pointerup', e => {
                    if (downY === null) return;
                    if (!isDragging) {
                        window.electronAPI.logInput(`${key}`);
                    }
                    downY = null;
                });

                const coffeeDescription = document.createElement('p');
                coffeeDescription.classList.add('description');
                coffeeDescription.textContent = coffee.description;

                const coffeePrice = document.createElement('p');
                coffeePrice.classList.add('price');
                coffeePrice.textContent = `Rp. ${coffee.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;

                coffeeItem.appendChild(coffeeImage);
                coffeeItem.appendChild(coffeeDescription);
                coffeeItem.appendChild(coffeePrice);
                coffeeList.appendChild(coffeeItem);
            });
        })
        .catch(error => {
            console.error('Error fetching coffee data:', error);
        });
});
