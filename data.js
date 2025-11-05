// --- Game Data ---

// Helper function to generate cat data
function createCatType(level, name, basePrice) {
  return {
    level: level,
    name: name,
    // income is calculated recursively after array is created
    basePrice: basePrice,
    currentPrice: basePrice, // Initial price is base price
    purchaseCount: 0, // Track purchases
    color: "#fff" // Color is no longer used, but good to keep struct a
  };
}

// Helper function to generate base prices
const catBasePrices = [0, 500]; // Lvl 1 and 2
for (let i = 2; i < 15; i++) {
  catBasePrices.push(catBasePrices[i - 1] * 3); // Lvl N = Lvl (N-1) * 3
}

const catTypes = [
  createCatType(1, "Kitten", catBasePrices[0]),
  createCatType(2, "Adult Cat", catBasePrices[1]),
  createCatType(3, "Nerd Cat", catBasePrices[2]),
  createCatType(4, "Greedy Cat", catBasePrices[3]),
  createCatType(5, "Chonky Cat", catBasePrices[4]),
  createCatType(6, "Catburger", catBasePrices[5]),
  createCatType(7, "Energy Cat", catBasePrices[6]),
  createCatType(8, "Scientist Cat", catBasePrices[7]),
  createCatType(9, "Angel Cat", catBasePrices[8]),
  createCatType(10, "Demon Cat", catBasePrices[9]),
  createCatType(11, "Galaxy Cat", catBasePrices[10]),
  createCatType(12, "Time Cat", catBasePrices[11]),
  createCatType(13, "Glitch Cat", catBasePrices[12]),
  createCatType(14, "Cosmic Cat", catBasePrices[13]),
  createCatType(15, "Omni Cat", catBasePrices[14]),
];

// Calculate income recursively
// Formula: cat1 = 1, catN = cat(N-1)*2 + cat(N-1)/1.5
for (let i = 0; i < catTypes.length; i++) {
  if (i === 0) {
    // Level 1 (index 0)
    catTypes[i].income = 1.0; // cat1 = 1 c/s
  } else {
    // Level n (index i)
    const prevIncome = catTypes[i - 1].income;
    // catn = cat(n-1)*2 + cat(n-1)/1.5
    catTypes[i].income = prevIncome * 2 + (prevIncome / 1.5);
  }
}

const upgrades = [
  {
    id: "delivery",
    name: "Cat Delivery",
    description: "Spawns a cat bed on Stage 1.",
    baseCost: 100,
    level: 0,
    maxLevel: 10,
    unlocked: true,
  },
  {
    id: "autoMerge",
    name: "Auto Merge",
    description: "Automatically merges matching cats (Lvl 1-5) on Stage 1.",
    baseCost: 80000,
    level: 0,
    unlocked: false,
  },
  {
    id: "fishSnack",
    name: "Fish Snack",
    description: "Spawns a fish snack on your highest stage. (10s 10x coin buff)",
    baseCost: 10000,
    level: 0,
    unlocked: false,
  },
];