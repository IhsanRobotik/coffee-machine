document.addEventListener('DOMContentLoaded', () => {
    const coffeeList = document.getElementById('coffeeList');

    // Listen for clicks on coffee images
    coffeeList.addEventListener('click', (event) => {
        if (event.target.tagName === 'IMG') {
            const coffeeIndex = event.target.dataset.index;
            console.log(`Selected coffee index: ${coffeeIndex}`);
            window.electronAPI.logInput(`${coffeeIndex}`);
        }
    });

    // Fetch JSON data and render the coffee items
    fetch('../products.json')
        .then((response) => response.json())
        .then((data) => {
            Object.keys(data).forEach((key) => {
                const coffee = data[key];
                const coffeeItem = document.createElement('div');
                coffeeItem.classList.add('coffee-item');

                const coffeeImage = document.createElement('img');
                coffeeImage.src = coffee.imagePath;
                coffeeImage.dataset.index = key;
                coffeeImage.alt = coffee.description;

                const coffeePrice = document.createElement('p');
                coffeePrice.classList.add('price');
                coffeePrice.textContent = `${coffee.price}`;

                coffeeItem.appendChild(coffeeImage);
                coffeeItem.appendChild(coffeePrice);
                coffeeList.appendChild(coffeeItem);
            });

            // Now that items are appended, clone them and setup infinite scroll
            cloneItems();
            setupInfiniteScroll();
        })
        .catch((error) => {
            console.error('Error fetching coffee data:', error);
        });
});
