// --- DOM Elements ---
const board = document.getElementById("board");
const boardWrapper = document.getElementById("board-wrapper"); // <-- ADDED
const coinsEl = document.getElementById("coins");
const coinsPerSecEl = document.getElementById("coinsPerSec");
const bedTracker = document.getElementById("bed-tracker");
const bedTimerEl = document.getElementById("bed-timer");

// Modals
const shopModal = document.getElementById("shop-modal");
const upgradesModal = document.getElementById("upgrades-modal");
const alertModal = document.getElementById("alert-modal");
const alertMessage = document.getElementById("alert-message");

// Modal Buttons
const openShopBtn = document.getElementById("open-shop-btn");
const openUpgradesBtn = document.getElementById("open-upgrades-btn");
const closeBtns = document.querySelectorAll(".close-btn");
const alertCloseBtn = document.getElementById("alert-close-btn");

// Stage Buttons
const stageBtns = document.querySelectorAll(".stage-btn");

// --- Game State ---
const MAX_ENTITIES = 15;
let coins = 0.0; // MODIFIED: Start as float
let coinsPerSec = 0.0; // MODIFIED: Start as float
let nextId = 1;
let deliveryInterval = null;
let maxLevelUnlocked = 0;

// Bed Timer State
let bedTimerInterval = null;
let deliveryIntervalMs = 0;
let nextBedSpawnTime = 0;

// --- NEW: Upgrade Intervals ---
let autoMergeInterval = null;
let fishSnackInterval = null;
let activeFishSnacks = [];


// --- Staged State ---
let currentStage = 0;
let maxStageUnlocked = 0;
let catsByStage = [[], [], []]; // Array of arrays for cats
let bedsByStage = [[], [], []]; // Array of arrays for beds

// --- NEW: Global Drag State (for touch and mouse) ---
let draggedItem = null; // Will be { type: 'cat' | 'snack', item: cat | snack }
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;


// --- Game Data ---

// Helper function to generate cat data
// MODIFIED: Removed income calculation from here
function createCatType(level, name, basePrice) {
  return {
    level: level,
    name: name,
    // income: Is now calculated recursively after array is created
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
  createCatType(7, "Fire Cat", catBasePrices[6]),
  createCatType(8, "Ice Cat", catBasePrices[7]),
  createCatType(9, "Angel Cat", catBasePrices[8]),
  createCatType(10, "Demon Cat", catBasePrices[9]),
  createCatType(11, "Galaxy Cat", catBasePrices[10]),
  createCatType(12, "Time Cat", catBasePrices[11]),
  createCatType(13, "Glitch Cat", catBasePrices[12]),
  createCatType(14, "Cosmic Cat", catBasePrices[13]),
  createCatType(15, "Omni Cat", catBasePrices[14]),
];

// --- NEW: Calculate income recursively ---
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
// --- END: New income calculation ---

const upgrades = [
  {
    id: "delivery",
    name: "Cat Delivery",
    description: "Spawns a cat bed. Lvl 1=9s, Lvl 2=8s...",
    baseCost: 100,
    level: 0,
    unlocked: true, // Always unlocked
  },
  // --- NEW UPGRADES ---
  {
    id: "autoMerge",
    name: "Auto Merge",
    // MODIFIED: Updated description
    description: "Automatically merges matching cats on Stage 1 (Lvl 1-5). Cooldown: 9s / 8s / 7s...",
    baseCost: 80000,
    level: 0,
    unlocked: false, // Unlocked with Stage 2
  },
  {
    id: "fishSnack",
    name: "Fish Snack",
    description: "Spawns a fish snack on Stage 1. Cooldown: 130s / 120s / 110s...",
    baseCost: 10000,
    level: 0,
    unlocked: false, // Unlocked with Stage 2
  },
];

// --- Helper Functions ---

function getStageForLevel(level) {
  if (level <= 5) return 0;
  if (level <= 10) return 1;
  return 2;
}

function getEntityCount(stageIndex) {
  return catsByStage[stageIndex].length + bedsByStage[stageIndex].length;
}

function showModalAlert(message) {
  alertMessage.textContent = message;
  alertModal.style.display = "flex";
}

function unlockStage(stageIndex) {
  if (stageIndex > maxStageUnlocked) {
    maxStageUnlocked = stageIndex;
    document.getElementById(`stage-btn-${stageIndex}`).style.display = "block";
    showModalAlert(`Stage ${stageIndex + 1} Unlocked!`);

    // --- NEW: Unlock upgrades when Stage 2 is reached ---
    if (stageIndex === 1) {
      const autoMergeUpg = upgrades.find(upg => upg.id === "autoMerge");
      if (autoMergeUpg) autoMergeUpg.unlocked = true;
      
      const fishSnackUpg = upgrades.find(upg => upg.id === "fishSnack");
      if (fishSnackUpg) fishSnackUpg.unlocked = true;
      
      showModalAlert("New Upgrades Unlocked: Auto Merge & Fish Snack!");
    }
  }
}

// --- Core Game Loop ---

// This function ONLY updates the coin text display
// MODIFIED: Show 1 decimal place
function updateCoinDisplay() {
  coinsEl.textContent = coins.toLocaleString(undefined, { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });
  coinsPerSecEl.textContent = coinsPerSec.toLocaleString(undefined, { 
    minimumFractionDigits: 1, 
    maximumFractionDigits: 1 
  });
}

// --- MODIFIED: Coin update loop ---
// Coin update runs 10 times per second (100ms)
setInterval(() => {
  let incomeThisTick = 0; // This is the total PER-SECOND income rate
  
  for (const stage of catsByStage) {
    stage.forEach(cat => {
      const catIncome = catTypes[cat.level - 1].income; // This is now a float

      // --- NEW: Check for fish snack buff ---
      if (cat.snackBuffEndTime && Date.now() < cat.snackBuffEndTime) {
        // Buff is active!
        // Add 10x its income to the per-second rate
        incomeThisTick += catIncome * 10;
        
        // --- ADDED: Squish and drop coin ball every tick (0.1s) while buffed ---
        triggerCatSquish(cat); 
        dropBall(cat.el);
        // ---------------------------------------------------------------------

      } else {
        // Buff is not active
        // 1. Add base income
        incomeThisTick += catIncome;
      
        if (cat.snackBuffEndTime && Date.now() >= cat.snackBuffEndTime) {
          // Buff expired
          cat.snackBuffEndTime = null;
          if(cat.el) cat.el.style.boxShadow = "none";
        }
      }
      // --- End of new buff check ---
    });
  }
  
  // Add 1/10th of the total per-second rate to coins
  coins += (incomeThisTick / 10); 
  coinsPerSec = incomeThisTick; // This will correctly show the 10x rate

  // Only update the text, don't re-render all buttons
  updateCoinDisplay();
}, 100);
// --- END MODIFIED: Coin update loop ---

// --- Stage Management ---

// --- NEW: Board resizing logic ---
let currentBoardRatio = 1; // Store the aspect ratio globally

// NEW function to load image, set ratio, and resize
function setBoardBackground(stageIndex) {
  const imageUrl = `url('images/board/board${stageIndex + 1}.png')`;
  const imageSrc = `images/board/board${stageIndex + 1}.png`;

  const img = new Image();
  
  img.onload = function() {
    // Image loaded, get dimensions and store aspect ratio
    const imgWidth = this.naturalWidth;
    const imgHeight = this.naturalHeight;
    currentBoardRatio = imgHeight / imgWidth; // Store aspect ratio
    
    resizeBoard(); // Call resize function to apply it
    board.style.backgroundImage = imageUrl;
  };
  
  img.onerror = function() {
    // Fallback on error
    console.error(`Failed to load board image: ${imageSrc}`);
    currentBoardRatio = 1; // Fallback to 1:1
    resizeBoard();
    board.style.backgroundImage = imageUrl;
  };
  
  // Start loading the image
  img.src = imageSrc;
}

// NEW function to apply board size based on current width and ratio
function resizeBoard() {
  if (!boardWrapper) return;
  // Get the computed width (handles 500px on desktop, 90vw on mobile, etc.)
  const currentWrapperWidthStyle = window.getComputedStyle(boardWrapper).width;
  const currentWrapperWidth = parseFloat(currentWrapperWidthStyle.replace('px', ''));
  
  // Set the new height based on the width and stored ratio
  const newHeight = currentWrapperWidth * currentBoardRatio;
  boardWrapper.style.height = `${newHeight}px`;
}

// NEW: Add resize listener to handle window resizing
window.addEventListener('resize', resizeBoard);
// --- End of new board resizing logic ---


function switchStage(newStage) {
  if (newStage > maxStageUnlocked) return;

  currentStage = newStage;

  // Change board background based on stage
  // board.style.backgroundImage = `url('images/board/board${newStage + 1}.png')`; // <-- OLD
  setBoardBackground(newStage); // <-- NEW: This function now handles loading and resizing

  stageBtns.forEach((btn, index) => {
    btn.classList.toggle("active", index === newStage);
  });
  
  for (let i = 0; i < catsByStage.length; i++) {
    catsByStage[i].forEach(cat => {
      cat.el.style.display = (i === newStage) ? "flex" : "none";
    });
  }

  for (let i = 0; i < bedsByStage.length; i++) {
    bedsByStage[i].forEach(bed => {
      bed.el.style.display = (i === newStage) ? "flex" : "none";
    });
  }
  
  // --- NEW: Show/Hide Fish Snacks ---
  // Snacks only live on stage 0
  activeFishSnacks.forEach(snack => {
    snack.el.style.display = (newStage === 0) ? "block" : "none";
  });
  
  // Note: renderShop() and renderUpgrades() are called when modals are opened
}

// --- Entity Spawning ---

function spawnBed(x, y, stageIndex) {
  if (getEntityCount(stageIndex) >= MAX_ENTITIES) return;

  const bed = {
    id: nextId++,
    x, y, stageIndex,
    el: document.createElement("div")
  };
  
  bed.el.className = "bed";
  bed.el.style.left = `${x}px`;
  bed.el.style.top = `${y}px`;
  bed.el.style.backgroundImage = `url('images/cats/bed.png')`;
  bed.el.style.display = (stageIndex === currentStage) ? "flex" : "none";
  
  board.appendChild(bed.el);
  bedsByStage[stageIndex].push(bed);

  bed.el.addEventListener("click", () => {
    bed.el.remove();
    bedsByStage[stageIndex] = bedsByStage[stageIndex].filter(b => b.id !== bed.id);
    const catX = parseFloat(bed.el.style.left.replace('px', '')) + 8; // Adjust for size difference
    const catY = parseFloat(bed.el.style.top.replace('px', '')) + 8;
    spawnCat(1, catX, catY, stageIndex, false);
  }, { once: true });
}

function spawnCat(level, x, y, stageIndex, fromMerge = false) {
  if (!fromMerge && getEntityCount(stageIndex) >= MAX_ENTITIES) {
    showModalAlert(`Stage ${stageIndex + 1} is full! Merge cats to make space.`);
    return null;
  }
  
  if (level > maxLevelUnlocked) {
    maxLevelUnlocked = level;
    // No need to re-render shop here, it renders on open
  }

  const catType = catTypes[level - 1];
  const cat = {
    id: nextId++,
    level, x, y, stageIndex,
    snackBuffEndTime: null, // NEW: Property for fish snack
    el: document.createElement("div")
  };
  
  cat.el.className = "cat";
  cat.el.style.backgroundImage = `url('images/cats/${level}.png')`;
  cat.el.style.left = `${x}px`;
  cat.el.style.top = `${y}px`;
  cat.el.dataset.id = cat.id;
  cat.el.style.display = (stageIndex === currentStage) ? "flex" : "none";

  // --- NEW: Spawn Animation ---
  if (fromMerge) {
    cat.el.classList.add("cat-spawn");
    setTimeout(() => {
      if (cat.el) cat.el.classList.remove("cat-spawn");
    }, 400); // Animation duration
  }
  // --- End Spawn Animation ---

  board.appendChild(cat.el);
  catsByStage[stageIndex].push(cat);

  cat.el.addEventListener("click", () => {
    if (cat.el.style.cursor === 'grabbing') return;
    
    // Earn coins
    const earned = catType.income; // This is now a float
    coins += earned; 
    updateCoinDisplay(); // Just update text
    
    // Trigger animations
    triggerCatSquish(cat);
    dropBall(cat.el);
  });

  makeDraggable(cat);
  return cat;
}

// --- Entity Interaction ---

// --- MODIFIED: makeDraggable (Refactored for Touch and Mouse) ---
function makeDraggable(cat) {
  
  function handleCatDragStart(clientX, clientY) {
    if (isDragging) return; // Don't start a new drag
    isDragging = true;
    draggedItem = { type: 'cat', item: cat };
    
    cat.el.style.cursor = 'grabbing';
    cat.el.style.zIndex = 10;
    
    const rect = cat.el.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;
    
    cat.el.classList.add("cat-dragging");
  }

  // Mouse drag start
  cat.el.addEventListener("mousedown", (e) => {
    // Prevent default behavior (e.g., image dragging)
    e.preventDefault();
    handleCatDragStart(e.clientX, e.clientY);
  });
  
  // Touch drag start
  cat.el.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleCatDragStart(touch.clientX, touch.clientY);
    }
    // We don't preventDefault here to allow "click" events to fire
  }, { passive: true }); // Use passive: true for better scroll performance if not preventing default
}
// --- END MODIFIED: makeDraggable ---


function checkMerge(cat) {
  // Don't check for merge if cat is already animating (merging)
  if (cat.el.classList.contains("cat-merging")) return;

  for (const other of catsByStage[cat.stageIndex]) {
    if (other.id === cat.id) continue;
    // Don't merge with a cat that is already merging
    if (other.el.classList.contains("cat-merging")) continue;
    
    const dx = cat.x - other.x;
    const dy = cat.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50 && cat.level === other.level) {
      if (cat.level >= catTypes.length) return; 
      mergeCats(cat, other);
      break;
    }
  }
}

// --- MODIFIED: mergeCats function for animation ---
function mergeCats(catA, catB) {
  const newLevel = catA.level + 1;
  const oldStage = catA.stageIndex;
  const newStage = getStageForLevel(newLevel);
  
  // Calculate center point for merge animation and spawning
  const spawnX = (catA.x + catB.x) / 2;
  const spawnY = (catA.y + catB.y) / 2;

  // 1. Remove cats from state array immediately
  // This prevents them from being merged again or moved by idle logic
  catsByStage[oldStage] = catsByStage[oldStage].filter(c => c.id !== catA.id && c.id !== catB.id);

  // 2. Add merging class to trigger CSS animation
  catA.el.classList.add("cat-merging");
  catB.el.classList.add("cat-merging");
  
  // 3. Calculate translation to center point
  const deltaXA = spawnX - catA.x;
  const deltaYA = spawnY - catA.y;
  const deltaXB = spawnX - catB.x;
  const deltaYB = spawnY - catB.y;

  // 4. Apply transform to move cats to center and shrink
  catA.el.style.transform = `translate(${deltaXA}px, ${deltaYA}px) scale(0.1)`;
  catB.el.style.transform = `translate(${deltaXB}px, ${deltaYB}px) scale(0.1)`;
  catA.el.style.opacity = 0;
  catB.el.style.opacity = 0;

  // 5. Use setTimeout to wait for animation to finish
  const animationDuration = 500; // Must match .cat-merging transition duration
  setTimeout(() => {
    // 6. Remove old cat elements
    catA.el.remove();
    catB.el.remove();

    // 7. Spawn the new cat
    if (newStage !== oldStage) {
      unlockStage(newStage);
      // Spawn in a default location on the new stage
      spawnCat(newLevel, 100, 100, newStage, true); 
    } else {
      // Spawn at the merge location
      spawnCat(newLevel, spawnX, spawnY, oldStage, true);
    }
  }, animationDuration);
}


// --- UI Rendering ---

function renderUpgrades() {
  const container = document.getElementById("upgradeItems");
  container.innerHTML = "";

  // --- NEW: Filter for unlocked upgrades ---
  const availableUpgrades = upgrades.filter(upg => upg.unlocked);

  availableUpgrades.forEach(upg => {
    let price;
    
    // --- UPDATED: Cost logic ---
    if (upg.id === 'delivery') {
      price = Math.round(upg.baseCost * Math.pow(10, upg.level));
    } else if (upg.id === 'autoMerge' || upg.id === 'fishSnack') {
      // New cost formula: lvln = lvl(n-1) * 10
      // Lvl 1: baseCost
      // Lvl 2: baseCost * 10
      // Lvl 3: baseCost * 10 * 10
      price = Math.round(upg.baseCost * Math.pow(10, upg.level));
    } else {
      // Default formula
      price = Math.round(upg.baseCost * Math.pow(1.5, upg.level));
    }
    
    const btn = document.createElement("button");
    btn.textContent = `${upg.name} (Lvl ${upg.level}) - ${price.toLocaleString()} coins`;
    btn.disabled = coins < price;
    btn.title = upg.description; // Add description on hover

    btn.addEventListener("click", () => {
      if (coins < price) return;
      
      coins -= price;
      upg.level++;
      
      // --- UPDATED: Trigger logic ---
      if (upg.id === "delivery") {
        triggerDeliveryUpgrade(upg.level);
      } else if (upg.id === "autoMerge") {
        triggerAutoMergeUpgrade(upg.level);
      } else if (upg.id === "fishSnack") {
        triggerFishSnackUpgrade(upg.level);
      }
      
      // Manually update display and re-render modals on purchase
      updateCoinDisplay();
      renderUpgrades();
      renderShop(); // Re-render shop in case coin change disabled buttons
    });
    container.appendChild(btn);
  });
}

function renderShop() {
  const shopContainer = document.getElementById("shopItems");
  shopContainer.innerHTML = "";

  // Shop is global.
  // You can buy cats up to 3 levels *below* your max level.
  const shopLevelCap = maxLevelUnlocked - 3;

  const availableCats = catTypes.filter(cat => {
    // Condition A: It's the Level 1 cat (always available)
    if (cat.level === 1) return true;
    
    // Condition B: It's a "feeder" cat (level > 1 and at/below the cap)
    if (cat.level > 1 && cat.level <= shopLevelCap) return true;

    // If none of the above, it's not available
    return false;
  });
  
  if (availableCats.length === 0) {
    const defaultMsg = (maxLevelUnlocked < 1) ? 
      "Click the bed to get your first cat!" :
      "Unlock higher-level cats by merging!";
    shopContainer.innerHTML = `<p>${defaultMsg}</p>`;
    return;
  }

  availableCats.forEach(catToShow => {
    const price = catToShow.currentPrice; // Prices are still integers
    const btn = document.createElement("button");
    
    // MODIFIED: Determine the cat's home stage
    const targetStage = getStageForLevel(catToShow.level);

    // MODIFIED: Update button text to show target stage AND purchase count
    // MODIFIED: Format income to 1 decimal place
    btn.innerHTML = `Buy ${catToShow.name} (Stage ${targetStage + 1})
                     <br>Cost: ${price.toLocaleString()}
                     <br>Income: ${catToShow.income.toFixed(1)}/s
                     <br>Purchased: ${catToShow.purchaseCount.toLocaleString()}`;
    
    // MODIFIED: Check entity count for the *target* stage
    btn.disabled = coins < price || getEntityCount(targetStage) >= MAX_ENTITIES;

    btn.addEventListener("click", () => {
      // MODIFIED: Check entity count for the *target* stage again
      if (coins < price || getEntityCount(targetStage) >= MAX_ENTITIES) {
         if (getEntityCount(targetStage) >= MAX_ENTITIES) {
            showModalAlert(`Stage ${targetStage + 1} is full! Merge cats to make space.`);
         }
         return;
      }
      
      const rect = board.getBoundingClientRect();
      const rx = Math.random() * (rect.width - 64);
      const ry = Math.random() * (rect.height - 64);

      // MODIFIED: Spawn cat on the *target* stage
      if (spawnCat(catToShow.level, rx, ry, targetStage, false)) {
         coins -= price;
         
         // Increment purchase count and update current price
         catToShow.purchaseCount++;
         // Prices are still rounded to integers
         catToShow.currentPrice = Math.round(catToShow.currentPrice * 1.25 + 50); 
         
         // Manually update display and re-render modals on purchase
         updateCoinDisplay(); 
         renderShop();
         renderUpgrades(); // Re-render upgrades in case coin change disabled them
      }
    });

    shopContainer.appendChild(btn);
  });
}


function triggerDeliveryUpgrade(newLevel) {
  if (deliveryInterval) clearInterval(deliveryInterval);
  if (bedTimerInterval) clearInterval(bedTimerInterval);

  // New time formula: 10 - Lvl (clamped to 1s)
  deliveryIntervalMs = Math.max(1000, (10 - newLevel) * 1000);
  
  if (deliveryIntervalMs <= 0) {
      // Max level reached, stop intervals
      if (deliveryInterval) clearInterval(deliveryInterval);
      if (bedTimerInterval) clearInterval(bedTimerInterval);
      bedTimerEl.textContent = "MAX";
      return;
  }
  
  nextBedSpawnTime = Date.now() + deliveryIntervalMs;
  bedTracker.style.display = "inline-flex"; // <-- MODIFIED from .visibility

  // Spawning logic (Runs on the longer interval)
  deliveryInterval = setInterval(() => {
    if (getEntityCount(0) < MAX_ENTITIES) {
      const rect = board.getBoundingClientRect();
      const rx = Math.random() * (rect.width - 80);
      const ry = Math.random() * (rect.height - 80);
      spawnBed(rx, ry, 0); // Always spawn on Stage 0
    }
    nextBedSpawnTime = Date.now() + deliveryIntervalMs;
  }, deliveryIntervalMs);

  // UI Timer logic (Runs every 100ms)
  bedTimerInterval = setInterval(() => {
    if (getEntityCount(0) >= MAX_ENTITIES) {
      bedTimerEl.textContent = "FULL";
      return;
    }
    
    const remainingMs = Math.max(0, nextBedSpawnTime - Date.now());
    const remainingSeconds = (remainingMs / 1000).toFixed(1);
    
    bedTimerEl.textContent = `${remainingSeconds}s`;
  }, 100);
}

// --- NEW: Upgrade Functions ---

function triggerAutoMergeUpgrade(newLevel) {
  if (autoMergeInterval) clearInterval(autoMergeInterval);
  
  // Cooldown = 9 - level (min 1 second)
  const cooldownMs = Math.max(1000, (9 - newLevel) * 1000);
  
  autoMergeInterval = setInterval(autoMergeCats, cooldownMs);
}

// MODIFIED: Updated autoMergeCats logic
function autoMergeCats() {
  // Only auto-merges on Stage 1 (index 0)
  const catsOnStage1 = catsByStage[0];
  
  // Find cats to merge, starting from lowest level (1) up to level 5.
  // We stop at 5 because merging Lvl 5 creates Lvl 6, which moves to Stage 2.
  for (let level = 1; level <= 5; level++) {
    const catsToMerge = catsOnStage1.filter(c => c.level === level);
    
    if (catsToMerge.length >= 2) {
      // Find two non-dragging cats
      const catA = catsToMerge[0];
      const catB = catsToMerge[1];
      
      // Check if they are somehow being dragged or already merging
      if (catA.el.style.cursor === 'grabbing' || catB.el.style.cursor === 'grabbing' ||
          catA.el.classList.contains('cat-merging') || catB.el.classList.contains('cat-merging')) {
        continue; // Skip this pair and check next level
      }
      
      console.log(`Auto-merging Lvl ${level} cats!`);
      mergeCats(catA, catB);
      return; // Stop after one merge, the interval will run again
    }
  }
}


function triggerFishSnackUpgrade(newLevel) {
  if (fishSnackInterval) clearInterval(fishSnackInterval);
  
  // Cooldown = 130 - (10 * level) (min 10 seconds)
  const cooldownMs = Math.max(10000, (130 - (10 * newLevel)) * 1000);
  
  // Spawn one immediately on first purchase
  if (newLevel === 1) spawnFishSnack(); 
  
  fishSnackInterval = setInterval(spawnFishSnack, cooldownMs);
}

function spawnFishSnack() {
  // Only spawn on Stage 1 (index 0)
  const rect = board.getBoundingClientRect();
  const x = Math.random() * (rect.width - 48); // 48 is snack width
  const y = Math.random() * (rect.height - 48); // 48 is snack height

  const snack = {
    id: nextId++,
    x, y,
    el: document.createElement("div")
  };
  
  snack.el.className = "fish-snack";
  snack.el.style.left = `${x}px`;
  snack.el.style.top = `${y}px`;
  snack.el.style.backgroundImage = `url('images/upgrades/fish.png')`;
  // Show only if player is on Stage 1
  snack.el.style.display = (currentStage === 0) ? "block" : "none";
  
  board.appendChild(snack.el);
  activeFishSnacks.push(snack);
  
  makeSnackDraggable(snack);
}

// --- MODIFIED: makeSnackDraggable (Refactored for Touch and Mouse) ---
function makeSnackDraggable(snack) {
  
  function handleSnackDragStart(clientX, clientY) {
    if (isDragging) return; // Don't start a new drag
    isDragging = true;
    draggedItem = { type: 'snack', item: snack };
    
    snack.el.style.cursor = 'grabbing';
    snack.el.style.zIndex = 20; // Topmost

    const rect = snack.el.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;
  }

  // Mouse drag start
  snack.el.addEventListener("mousedown", (e) => {
    // Prevent default behavior (e.g., image dragging)
    e.preventDefault();
    handleSnackDragStart(e.clientX, e.clientY);
  });

  // Touch drag start
  snack.el.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handleSnackDragStart(touch.clientX, touch.clientY);
    }
  }, { passive: true });
}
// --- END MODIFIED: makeSnackDraggable ---


function checkSnackDrop(snack) {
  // Snacks can only be given to cats on Stage 1
  for (const cat of catsByStage[0]) {
    if (cat.snackBuffEndTime) continue; // Skip cats that already have a buff

    const dx = snack.x - cat.x;
    const dy = snack.y - cat.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 50) { // 50px collision radius
      giveSnackToCat(cat);
      
      // Remove snack
      snack.el.remove();
      activeFishSnacks = activeFishSnacks.filter(s => s.id !== snack.id);
      return; // Stop checking
    }
  }
}

function giveSnackToCat(cat) {
  if (cat.snackBuffEndTime) return; // Already has buff
  
  cat.snackBuffEndTime = Date.now() + 10000; // 10 second buff
  
  // Add visual indicator
  if(cat.el) cat.el.style.boxShadow = "0 0 10px 5px #ff9900"; // Orange glow
  
  // Set timeout to remove visual indicator
  setTimeout(() => {
    if (cat && cat.el) {
       // Check if buff wasn't reapplied
      if (!cat.snackBuffEndTime || Date.now() > cat.snackBuffEndTime) {
         cat.el.style.boxShadow = "none";
      }
    }
  }, 10000);
}


// --- Animation Functions ---

function dropBall(catElement) {
  if (!catElement) return;

  const ball = document.createElement("div");
  ball.className = "coin-ball";
  
  // Start ball from the center of the cat
  const startX = catElement.offsetLeft + (catElement.clientWidth / 2) - 10; // 10 is half ball width
  const startY = catElement.offsetTop + (catElement.clientHeight / 2) - 10; // 10 is half ball height
  
  ball.style.left = `${startX}px`;
  ball.style.top = `${startY}px`;
  
  // Add to board (which is the parent)
  board.appendChild(ball);

  // Remove ball from DOM after animation (2.0s total)
  setTimeout(() => {
    if (ball) ball.remove();
  }, 2000); // Must match animation duration in style.css
}

function triggerCatSquish(cat) {
  // Check if cat, its element exist, and it's not already squishing
  if (!cat || !cat.el || cat.el.classList.contains('cat-squish')) return;

  cat.el.classList.add('cat-squish');
  
  // Remove class after animation
  setTimeout(() => {
    // Check if element still exists before removing class
    if (cat && cat.el) {
      cat.el.classList.remove('cat-squish');
    }
  }, 300); // Must match animation duration in CSS
}

// --- Initial Setup & Event Listeners ---
// ... (rest of your script.js code)

// --- Image Preloading Function ---
function preloadImages() {
  const imagesToLoad = [];

  // 1. Cat Images (Levels 1 through 15)
  for (let i = 1; i <= catTypes.length; i++) {
    imagesToLoad.push(`images/cats/${i}.png`);
  }
  
  // 2. Other Core Assets
  imagesToLoad.push('images/cats/bed.png');
  imagesToLoad.push('images/balls/ball1.PNG');

  // 3. Stage Backgrounds
  imagesToLoad.push('images/board/board1.png');
  imagesToLoad.push('images/board/board2.png');
  imagesToLoad.push('images/board/board3.png');
  
  // 4. NEW: Upgrade Assets
  imagesToLoad.push('images/upgrades/fish.png');


  let loadedCount = 0;
  const totalCount = imagesToLoad.length;
  
  imagesToLoad.forEach(src => {
    const img = new Image();
    // This line starts the download request
    img.src = src; 
    
    // Optional: You could listen to 'onload' events to show a loading bar
    img.onload = () => {
      loadedCount++;
      // Once all are loaded, you could hide a "Loading..." screen
      if (loadedCount === totalCount) {
        console.log("All game assets preloaded.");
      }
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
    };
  });
}


// --- Initial Game Start ---

preloadImages(); // Start preloading immediately
// board.style.backgroundImage = `url('images/board/board1.png')`; // <-- OLD
setBoardBackground(0); // <-- NEW: This handles loading the image and setting size
spawnBed(220, 220, 0); 

// Modal Listeners
openShopBtn.addEventListener("click", () => {
  renderShop(); // Re-render shop when opening
  shopModal.style.display = "flex";
});
openUpgradesBtn.addEventListener("click", () => {
  renderUpgrades(); // Re-render upgrades when opening
  upgradesModal.style.display = "flex";
});

closeBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    shopModal.style.display = "none";
    upgradesModal.style.display = "none";
  });
});

alertCloseBtn.addEventListener("click", () => alertModal.style.display = "none");

// Close modal if clicking outside content
window.addEventListener("click", (e) => {
  if (e.target == shopModal) shopModal.style.display = "none";
  if (e.target == upgradesModal) upgradesModal.style.display = "none";
  if (e.target == alertModal) alertModal.style.display = "none";
});

// Stage Button Listeners
stageBtns.forEach((btn, index) => {
  btn.addEventListener("click", () => switchStage(index));
});

// --- Automatic Animation Loop ---
// (Squish & Ball Drop)
setInterval(() => {
  const activeCats = catsByStage[currentStage];
  if (activeCats.length === 0) return;

  // Animate ALL cats
  activeCats.forEach(cat => {
    if (cat && cat.el) {
      triggerCatSquish(cat);
      // NOTE: Only drop ball if it's the base income tick. 
      // Buffed cats now drop a ball every 0.1s from the main interval.
      // This ensures non-buffed cats still drop a ball every 1.5s
      if (!cat.snackBuffEndTime || Date.now() >= cat.snackBuffEndTime) {
         dropBall(cat.el); 
      }
    }
  });
}, 1500); // Runs every 1.5 second


// --- NEW: Cat Idle Movement Loop ---
setInterval(() => {
  const activeCats = catsByStage[currentStage];
  const rect = board.getBoundingClientRect();

  activeCats.forEach(cat => {
    if (!cat || !cat.el) return;
    
    // Check if cat is not being dragged or merging
    if (cat.el.style.cursor !== 'grabbing' && !cat.el.classList.contains('cat-merging')) {
      // 50% chance to move
      if (Math.random() < 0.5) {
        // Calculate a small random move
        const dX = (Math.random() - 0.5) * 70; // Move up to +-35px
        const dY = (Math.random() - 0.5) * 70; // Move up to +-35px
        
        // Clamp to board boundaries
        let newX = cat.x + dX;
        let newY = cat.y + dY;
        newX = Math.max(0, Math.min(newX, rect.width - cat.el.clientWidth));
        newY = Math.max(0, Math.min(newY, rect.height - cat.el.clientHeight));

        // Update cat state and element style
        cat.x = newX;
        cat.y = newY;
        cat.el.style.left = `${newX}px`;
        cat.el.style.top = `${newY}px`;
      }
    }
  });
}, 2500); // Runs every 2.5 seconds


// --- NEW: GLOBAL DRAG HANDLERS (for Touch and Mouse) ---

function handleDragMove(clientX, clientY) {
  if (!isDragging || !draggedItem) return;

  const { item } = draggedItem;
  const rect = board.getBoundingClientRect();
  
  let newX = clientX - rect.left - dragOffsetX;
  let newY = clientY - rect.top - dragOffsetY;

  // Clamp to board boundaries
  newX = Math.max(0, Math.min(newX, rect.width - item.el.clientWidth));
  newY = Math.max(0, Math.min(newY, rect.height - item.el.clientHeight));

  item.x = newX;
  item.y = newY;
  item.el.style.left = `${newX}px`;
  item.el.style.top = `${newY}px`;
}

function handleDragEnd() {
  if (!isDragging || !draggedItem) return;

  const { type, item } = draggedItem;

  if (type === 'cat') {
    item.el.style.cursor = 'grab';
    item.el.style.zIndex = 2;
    item.el.classList.remove("cat-dragging");
    // Check for merge
    checkMerge(item);
  } else if (type === 'snack') {
    item.el.style.cursor = 'grab';
    item.el.style.zIndex = 15;
    // Check for drop
    checkSnackDrop(item);
  }

  isDragging = false;
  draggedItem = null;
}

// --- Global Mouse Listeners ---
document.addEventListener("mousemove", (e) => {
  handleDragMove(e.clientX, e.clientY);
});
document.addEventListener("mouseup", () => {
  handleDragEnd();
});

// --- Global Touch Listeners ---
document.addEventListener("touchmove", (e) => {
  if (!isDragging) return;
  e.preventDefault(); // Prevent screen from scrolling
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  }
}, { passive: false }); // We must set passive: false to allow preventDefault

document.addEventListener("touchend", (e) => {
  handleDragEnd();
});

document.addEventListener("touchcancel", () => {
  // Handle cases where the touch is interrupted (e.g., by a system alert)
  handleDragEnd();
});
