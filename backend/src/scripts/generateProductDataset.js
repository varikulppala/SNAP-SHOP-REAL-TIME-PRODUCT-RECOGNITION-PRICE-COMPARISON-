const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '../../data/products.json');

const baseProducts = [
  {
    product: 'Red Bull 250ml',
    amazon: 110,
    flipkart: 105,
    jiomart: 102
  },
  {
    product: 'Coca-Cola 500ml',
    amazon: 40,
    flipkart: 38,
    jiomart: 36
  },
  {
    product: "Lay's Classic Salted 100g",
    amazon: 30,
    flipkart: 29,
    jiomart: 28
  }
];

const categories = [
  'Beverages',
  'Energy Drinks',
  'Snacks',
  'Biscuits',
  'Chocolates',
  'Instant Noodles',
  'Cooking Oil',
  'Dairy',
  'Personal Care',
  'Household'
];

const generated = [];

for (let i = 0; i < 200; i++) {
  if (i < baseProducts.length) {
    generated.push(baseProducts[i]);
  } else {
    const idx = i + 1;
    const category = categories[i % categories.length];
    const basePrice = 20 + ((i * 7) % 180); // between 20 and ~200
    const amazon = basePrice;
    const flipkart = Math.max(10, basePrice - 3);
    const jiomart = Math.max(8, basePrice - 5);

    generated.push({
      product: `Demo ${category} Product ${idx}`,
      amazon,
      flipkart,
      jiomart
    });
  }
}

fs.writeFileSync(outputPath, JSON.stringify(generated, null, 2), 'utf8');
console.log(`Generated ${generated.length} products at ${outputPath}`);

