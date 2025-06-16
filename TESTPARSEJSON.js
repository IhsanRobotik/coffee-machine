const fs = require('fs');
const path = require('path');

// Load and parse products.json
const productFilePath = path.join(__dirname, 'products.json');
const products = JSON.parse(fs.readFileSync(productFilePath, 'utf8'));

// Example: lastInput is "1", "2", etc.
const lastInput = "8"; // or whatever value you have

// Get the selected product
const selectedProduct = products[lastInput];

if (selectedProduct) {
    // Access fields as numbers
    const coffee = Number(selectedProduct.coffee);
    const sugar = Number(selectedProduct.sugar);
    const creamer = Number(selectedProduct.creamer);
    const water = Number(selectedProduct.water);
    const price = Number(selectedProduct.price);

    console.log({ coffee, sugar, creamer, water, price });
} else {
    console.error('Product not found for input:', lastInput);
}