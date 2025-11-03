// --- DOM Elements ---
const board = document.getElementById("board");
const boardWrapper = document.getElementById("board-wrapper"); // <-- ADDED
const coinsEl = document.getElementById("coins");
const coinsPerSecEl = document.getElementById("coinsPerSec");
const bedTracker = document.getElementById("bed-tracker");
const bedTimerEl = document.getElementById("bed-timer");
const bgMusic = document.getElementById("bg-music"); // <-- FIX 2

// Modals
const shopModal = document.getElementById("shop-modal");
const upgradesModal = document.getElementById("upgrades-modal");
const alertModal = document.getElementById("alert-modal");
const alertMessage = document.getElementById("alert-message");
const resetModal = document.getElementById("reset-modal");
const optionsModal = document.getElementById("options-modal"); // <-- FIX 3

// Modal Buttons
const openShopBtn = document.getElementById("open-shop-btn");
const openUpgradesBtn = document.getElementById("open-upgrades-btn");
const closeBtns = document.querySelectorAll(".close-btn");
const alertCloseBtn = document.getElementById("alert-close-btn");
const resetConfirmBtn = document.getElementById("reset-confirm-btn");
const resetCancelBtn = document.getElementById("reset-cancel-btn");

// --- FIX 3: Options Modal Elements ---
const openOptionsBtn = document.getElementById("open-options-btn");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");
const resetBtn = document.getElementById("reset-btn"); // This is now the button inside the options modal
// --- END FIX 3 ---

// Stage Buttons
const stageBtns = document.querySelectorAll(".stage-btn");

// --- Game State ---
const MAX_ENTITIES = 15;
let coins = 0.0; // MODIFIED: Start as float
let coinsPerSec = 0.0; // MODIFIED: Start as float
let nextId = 1;
let deliveryInterval = null;
let maxLevelUnlocked = 0;
let autoOpenBeds = false;
let isMusicStarted = false; // <-- FIX 2

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

// --- FIX 4: Updated Descriptions ---
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
// --- END FIX 4 ---


// --- Helper Functions ---

// --- FIX 2: Play Music Function (This is the only place we call .play()) ---
function playMusic() {
  if (isMusicStarted || !bgMusic) return;
  bgMusic.volume = parseFloat(volumeSlider.value);
  bgMusic.play().then(() => {
    isMusicStarted = true;
  }).catch(e => {
    // This is expected if the user interaction wasn't trusted (e.g., programmatic click)
    console.warn("Audio play failed, user must interact directly with a trusted element first.", e);
  });
}
// --- END FIX 2 ---

function getStageForLevel(level) {
  if (level <= 5) return 0;
  if (level <= 10) return 1;
  return 2;
}

function getEntityCount(stageIndex) {
  // Need to check if stage exists
  if (!catsByStage[stageIndex] || !bedsByStage[stageIndex]) return 0;
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

  // --- FIX 3: Iterate with stage index ---
  for (let i = 0; i < catsByStage.length; i++) {
    const stage = catsByStage[i];
    const isStageVisible = (i === currentStage);
    // --- END FIX 3 ---

    stage.forEach(cat => {
      const catIncome = catTypes[cat.level - 1].income; // This is now a float

      // --- NEW: Check for fish snack buff ---
      if (cat.snackBuffEndTime && Date.now() < cat.snackBuffEndTime) {
        // Buff is active!
        // Add 10x its income to the per-second rate
        incomeThisTick += catIncome * 10;

        // --- FIX 3: Only animate if cat is on the current stage ---
        if (isStageVisible) {
            triggerCatSquish(cat);
            dropBall(cat.el);
        }
        // --- END FIX 3 ---

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
  } // --- FIX 3: End of new for loop ---

  // Add 1/10th of the total per-second rate to coins
  coins += (incomeThisTick / 10);
  coinsPerSec = incomeThisTick; // This will correctly show the 10x rate

  // Only update the text, don't re-render all buttons
  updateCoinDisplay();

  // --- FIX 1: Update modal button states ---
  if (shopModal.style.display === "flex") {
      document.querySelectorAll("#shopItems button").forEach(btn => {
          const cost = parseFloat(btn.dataset.cost);
          const targetStage = parseInt(btn.dataset.stage);
          // Check for NaN just in case
          if (!isNaN(cost) && !isNaN(targetStage)) {
            btn.disabled = coins < cost || getEntityCount(targetStage) >= MAX_ENTITIES;
          }
      });
  }
  if (upgradesModal.style.display === "flex") {
      document.querySelectorAll("#upgradeItems button").forEach(btn => {
          const cost = parseFloat(btn.dataset.cost);
          if (!isNaN(cost)) {
            btn.disabled = coins < cost;
          }
      });
  }
  // --- END FIX 1 ---
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

  // --- FIX 2: Show/Hide Fish Snacks (by stageIndex) ---
  activeFishSnacks.forEach(snack => {
    snack.el.style.display = (newStage === snack.stageIndex) ? "block" : "none";
  });
  // --- END FIX 2 ---

  // Note: renderShop() and renderUpgrades() are called when modals are opened
}

// --- Entity Spawning ---

// --- FIX 3: Modified spawnBed ---
function spawnBed(x, y, stageIndex, autoOpen = false) {
  if (getEntityCount(stageIndex) >= MAX_ENTITIES) {
    // Bed timer loop will show "FULL", so no alert needed here
    return;
  }

  const rect = board.getBoundingClientRect();
  const rx = x !== null ? x : Math.random() * (rect.width - 80);
  const ry = y !== null ? y : Math.random() * (rect.height - 80);

  if (autoOpen) {
    // Auto-open: just spawn the cat directly
    // The previous fix removed playMusic() from here, which is correct.
    spawnCat(1, rx + 8, ry + 8, stageIndex, false); // Adjust for size diff
    return;
  }

  // Normal bed spawn logic
  const bed = {
    id: nextId++,
    x: rx, y: ry, stageIndex,
    el: document.createElement("div")
  };

  bed.el.className = "bed";
  bed.el.style.left = `${rx}px`;
  bed.el.style.top = `${ry}px`;
  bed.el.style.backgroundImage = `url('images/cats/bed.png')`;
  bed.el.style.display = (stageIndex === currentStage) ? "flex" : "none";

  board.appendChild(bed.el);
  bedsByStage[stageIndex].push(bed);

  bed.el.addEventListener("click", () => {
    // playMusic(); // <-- REMOVED: Relying on global body listener for first interaction
    bed.el.remove();
    bedsByStage[stageIndex] = bedsByStage[stageIndex].filter(b => b.id !== bed.id);
    const catX = parseFloat(bed.el.style.left.replace('px', '')) + 8; // Adjust for size difference
    const catY = parseFloat(bed.el.style.top.replace('px', '')) + 8;
    spawnCat(1, catX, catY, stageIndex, false);
  }, { once: true });
}
// --- END FIX 3 ---

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
  if (!catType) {
    console.error(`Invalid cat level ${level}. Cannot spawn.`);
    return null;
  }
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
    // playMusic(); // <-- REMOVED: Relying on global body listener for first interaction
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


// --- FIX 2: Modified mergeCats for Stage Ascension ---
function mergeCats(catA, catB) {
  const newLevel = catA.level + 1;
  const oldStage = catA.stageIndex;
  const newStage = getStageForLevel(newLevel);

  const spawnX = (catA.x + catB.x) / 2;
  const spawnY = (catA.y + catB.y) / 2;

  // 1. Remove cats from state array immediately
  catsByStage[oldStage] = catsByStage[oldStage].filter(c => c.id !== catA.id && c.id !== catB.id);

  // --- FIX 2: Pre-spawn new cat for stable c/s ---
  let newCat = null;
  const isFirstTimeUnlock = (newStage > maxStageUnlocked); // <-- Check *before* unlockStage

  if (newStage !== oldStage) {
    if (isFirstTimeUnlock) {
      unlockStage(newStage); // This will update maxStageUnlocked
    }
    // Spawn at default location on new stage
    newCat = spawnCat(newLevel, 100, 100, newStage, true);
  } else {
    // Spawn at merge location on same stage
    newCat = spawnCat(newLevel, spawnX, spawnY, oldStage, true);
  }

  if (newCat) {
    // Hide it and make it non-interactive during animation.
    newCat.el.style.visibility = 'hidden';
    newCat.el.style.pointerEvents = 'none';
    // spawnCat already handles display:none if stage is wrong
  }
  // --- END FIX 2 ---


  // 2. Add merging class to trigger CSS animation
  // --- FIX 2 (Stage Ascend): Check for first time unlock ---
  if (isFirstTimeUnlock) {
      catA.el.classList.add("cat-ascending");
      catB.el.classList.add("cat-ascending");
  } else {
      catA.el.classList.add("cat-merging");
      catB.el.classList.add("cat-merging");
  }
  // --- END FIX 2 ---

  // 3. Calculate translation to center point
  const deltaXA = spawnX - catA.x;
  const deltaYA = spawnY - catA.y;
  const deltaXB = spawnX - catB.x;
  const deltaYB = spawnY - catB.y;

  // 4. Apply transform
  // --- FIX 2 (Stage Ascend): Modify transform logic ---
  if (isFirstTimeUnlock) {
      // Don't move to center. Just expand and fade in place.
      catA.el.style.transform = `scale(5)`;
      catB.el.style.transform = `scale(5)`;
  } else {
      // Original logic: move to center and shrink
      catA.el.style.transform = `translate(${deltaXA}px, ${deltaYA}px) scale(0.1)`;
      catB.el.style.transform = `translate(${deltaXB}px, ${deltaYB}px) scale(0.1)`;
  }
  // --- END FIX 2 ---
  catA.el.style.opacity = 0;
  catB.el.style.opacity = 0;

  // 5. Use setTimeout to wait for animation to finish
  // --- FIX 2 (Stage Ascend): Use longer duration for ascend ---
  const animationDuration = isFirstTimeUnlock ? 1500 : 500; // 1.5s for ascend, 0.5s for normal merge
  // --- END FIX 2 ---

  setTimeout(() => {
    // 6. Remove old cat elements
    catA.el.remove();
    catB.el.remove();

    // --- FIX 2 (Stage Ascend): Switch stage if first time ---
    if (isFirstTimeUnlock) {
        switchStage(newStage); // <-- THE AUTO-SWITCH
    }
    // --- END FIX 2 ---

    // --- FIX 2: Reveal pre-spawned cat ---
    if (newCat) {
        newCat.el.style.visibility = 'visible';
        newCat.el.style.pointerEvents = 'auto';

        // Re-trigger spawn animation (spawnCat already did it, but it was hidden)
        newCat.el.classList.add("cat-spawn");
        setTimeout(() => {
           if (newCat.el) newCat.el.classList.remove("cat-spawn");
        }, 400);
    }
    // --- END FIX 2 ---
  }, animationDuration);
}


// --- UI Rendering ---

// --- FIX 1: Reverted renderUpgrades ---
function renderUpgrades() {
  const container = document.getElementById("upgradeItems");
  container.innerHTML = "";

  const availableUpgrades = upgrades.filter(upg => upg.unlocked);

  availableUpgrades.forEach(upg => {
    let price;
    let levelUpText = "";

    if (upg.id === 'delivery') {
      price = Math.round(upg.baseCost * Math.pow(10, upg.level));
      // Delivery Level Text
      if (upg.level < upg.maxLevel - 1) {
          let currentSpeed = 10 - upg.level;
          let nextSpeed = 10 - (upg.level + 1);
          levelUpText = `Cooldown: ${currentSpeed}s → ${nextSpeed}s`;
      } else if (upg.level === upg.maxLevel - 1) {
          levelUpText = `Next Level: AUTO-OPEN BEDS!`;
      }

    } else if (upg.id === 'autoMerge') {
      price = Math.round(upg.baseCost * Math.pow(10, upg.level));
      // AutoMerge Level Text
      let currentSpeed = Math.max(1, 9 - upg.level);
      let nextSpeed = Math.max(1, 9 - (upg.level + 1));
      if (currentSpeed > 1) {
         levelUpText = `Cooldown: ${currentSpeed}s → ${nextSpeed}s`;
      } else {
         levelUpText = `Cooldown: 1s (MAX)`;
      }

    } else if (upg.id === 'fishSnack') {
      price = Math.round(upg.baseCost * Math.pow(10, upg.level));
      // FishSnack Level Text
      let currentSpeed = Math.max(10, 130 - (10 * upg.level));
      let nextSpeed = Math.max(10, 130 - (10 * (upg.level + 1)));
      if (currentSpeed > 10) {
          levelUpText = `Cooldown: ${currentSpeed}s → ${nextSpeed}s`;
      } else {
          levelUpText = `Cooldown: 10s (MAX)`;
      }

    } else {
      price = Math.round(upg.baseCost * Math.pow(1.5, upg.level));
    }

    // Check for Max Level
    if (upg.maxLevel && upg.level >= upg.maxLevel) {
      const btn = document.createElement("button");
      btn.textContent = `${upg.name} (Lvl MAX)`;
      btn.disabled = true;
      container.appendChild(btn);

      // Add description element
      const descEl = document.createElement("div");
      descEl.className = "upgrade-description";
      if (upg.id === 'delivery') levelUpText = `AUTO-OPEN BEDS (1/s)`;
      descEl.innerHTML = `${upg.description}<br><span style="color: #0056b3; font-weight: bold;">${levelUpText}</span>`;
      container.appendChild(descEl);

      return; // Skip to next upgrade
    }

    const btn = document.createElement("button");
    btn.textContent = `${upg.name} (Lvl ${upg.level}) - ${price.toLocaleString()} coins`;
    btn.disabled = coins < price;
    btn.dataset.cost = price;

    btn.addEventListener("click", () => {
      if (coins < price) return;

      coins -= price;
      upg.level++;

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

    // Add description element
    const descEl = document.createElement("div");
    descEl.className = "upgrade-description";
    descEl.innerHTML = `${upg.description}<br><span style="color: #0056b3; font-weight: bold;">${levelUpText}</span>`;
    container.appendChild(descEl);
  });
}
// --- END FIX 1 ---


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
    btn.dataset.cost = price; // <-- FIX 1
    btn.dataset.stage = targetStage; // <-- FIX 1

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

// --- FIX 3: Modified triggerDeliveryUpgrade ---
function triggerDeliveryUpgrade(newLevel) {
  if (deliveryInterval) clearInterval(deliveryInterval);
  if (bedTimerInterval) clearInterval(bedTimerInterval);

  const deliveryUpg = upgrades.find(upg => upg.id === 'delivery');

  if (deliveryUpg && newLevel >= deliveryUpg.maxLevel) {
      // Max level reached
      bedTimerEl.textContent = "AUTO";
      if (!autoOpenBeds) {
          autoOpenBeds = true;
          showModalAlert("Max Delivery Reached! Beds will now auto-open.");
      }

      deliveryIntervalMs = 1000; // Spawn at max rate (1s)
      nextBedSpawnTime = Date.now() + deliveryIntervalMs;
      bedTracker.style.display = "inline-flex";

      // Spawning logic (auto-opening)
      deliveryInterval = setInterval(() => {
          // Pass true for autoOpen
          spawnBed(null, null, 0, true);
          nextBedSpawnTime = Date.now() + deliveryIntervalMs;
      }, deliveryIntervalMs);

      // UI Timer logic
      bedTimerInterval = setInterval(() => {
          if (getEntityCount(0) >= MAX_ENTITIES) {
              bedTimerEl.textContent = "FULL";
              return;
          }
          // Just show AUTO, no timer
          bedTimerEl.textContent = "AUTO";
      }, 100); // Check for FULL every 100ms

  } else {
      // Not max level, normal timed bed logic
      deliveryIntervalMs = Math.max(1000, (10 - newLevel) * 1000);

      if (deliveryIntervalMs <= 0) { // Failsafe
          if (deliveryInterval) clearInterval(deliveryInterval);
          if (bedTimerInterval) clearInterval(bedTimerInterval);
          bedTimerEl.textContent = "MAX";
          return;
      }

      nextBedSpawnTime = Date.now() + deliveryIntervalMs;
      bedTracker.style.display = "inline-flex";

      // Normal spawning logic
      deliveryInterval = setInterval(() => {
          if (getEntityCount(0) < MAX_ENTITIES) {
              const rect = board.getBoundingClientRect();
              const rx = Math.random() * (rect.width - 80);
              const ry = Math.random() * (rect.height - 80);
              spawnBed(rx, ry, 0, false); // Pass false
          }
          nextBedSpawnTime = Date.now() + deliveryIntervalMs;
      }, deliveryIntervalMs);

      // Normal UI Timer logic
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
}
// --- END FIX 3 ---


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
          catA.el.classList.contains('cat-merging') || catB.el.classList.contains('cat-merging') ||
          catA.el.classList.contains('cat-ascending') || catB.el.classList.contains('cat-ascending')) {
        continue; // Skip this pair and check next level
      }

      // console.log(`Auto-merging Lvl ${level} cats!`);
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

// --- FIX 2: Modified spawnFishSnack ---
function spawnFishSnack() {
  // Spawn on latest unlocked stage
  const targetStage = maxStageUnlocked;

  const rect = board.getBoundingClientRect();
  const x = Math.random() * (rect.width - 48); // 48 is snack width
  const y = Math.random() * (rect.height - 48); // 48 is snack height

  const snack = {
    id: nextId++,
    x, y,
    stageIndex: targetStage, // Store the snack's stage
    el: document.createElement("div")
  };

  snack.el.className = "fish-snack";
  snack.el.style.left = `${x}px`;
  snack.el.style.top = `${y}px`;
  snack.el.style.backgroundImage = `url('images/upgrades/fish.png')`;
  // Show only if player is on the snack's stage
  snack.el.style.display = (currentStage === targetStage) ? "block" : "none";

  board.appendChild(snack.el);
  activeFishSnacks.push(snack);

  makeSnackDraggable(snack);
}
// --- END FIX 2 ---


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

// --- FIX 2: Modified checkSnackDrop ---
function checkSnackDrop(snack) {
  // Snacks can only be given to cats on the snack's own stage
  for (const cat of catsByStage[snack.stageIndex]) {
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
// --- END FIX 2 ---


// --- FIX 4: Modified to accept duration ---
function giveSnackToCat(cat, duration = 10000) {
  if (!cat || cat.snackBuffEndTime) return; // Already has buff

  cat.snackBuffEndTime = Date.now() + duration; // 10 second buff

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
  }, duration);
}


// --- Animation Functions ---

function dropBall(catElement) {
  // --- FIX 3: Add check ---
  if (!catElement || catElement.style.display === 'none') return;
  // --- END FIX 3 ---

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


// --- FIX 4: Save & Load Functions ---

// --- FIX 1: New function to manually reset state ---
function resetGameState() {
  // 1. Remove all cat/bed/snack elements
  board.innerHTML = ''; // Easiest way

  // 2. Clear state arrays
  catsByStage = [[], [], []];
  bedsByStage = [[], [], []];
  activeFishSnacks = [];

  // 3. Reset simple state
  coins = 0.0;
  maxLevelUnlocked = 0;
  maxStageUnlocked = 0;
  currentStage = 0;
  autoOpenBeds = false;

  // 4. Reset upgrades to level 0
  upgrades.forEach(upg => {
    upg.level = 0;
    // Re-lock autoMerge and fishSnack
    if(upg.id === 'autoMerge' || upg.id === 'fishSnack') {
      upg.unlocked = false;
    }
  });

  // 5. Reset catTypes prices
  catTypes.forEach(type => {
    type.currentPrice = type.basePrice;
    type.purchaseCount = 0;
  });

  // 6. Stop all intervals
  if (deliveryInterval) clearInterval(deliveryInterval);
  if (bedTimerInterval) clearInterval(bedTimerInterval);
  if (autoMergeInterval) clearInterval(autoMergeInterval);
  if (fishSnackInterval) clearInterval(fishSnackInterval);

  // 7. Reset UI
  bedTracker.style.display = 'none';
  stageBtns.forEach((btn, index) => {
      if (index === 0) {
          btn.classList.add('active');
      } else {
          btn.classList.remove('active');
          btn.style.display = 'none';
      }
  });
  setBoardBackground(0);

  // --- FIX 2 & 3: Reset Volume ---
  volumeSlider.value = 0.1;
  volumeValue.textContent = "10";
  if (bgMusic) bgMusic.volume = 0.1;
  // --- END FIX 2 & 3 ---
}
// --- END FIX 1 ---

function getSaveData() {
  // 1. Serialize cats (store minimal data)
  const savedCats = catsByStage.map(stage =>
    stage.map(cat => ({
      level: cat.level,
      x: cat.x,
      y: cat.y,
      stageIndex: cat.stageIndex,
      snackBuffEndTime: cat.snackBuffEndTime // Save buff state
    }))
  );

  // 2. Serialize upgrade levels
  const savedUpgrades = upgrades.map(upg => ({
    id: upg.id,
    level: upg.level
  }));

  // 3. Serialize cat prices
  const savedCatTypes = catTypes.map(type => ({
     level: type.level,
     currentPrice: type.currentPrice,
     purchaseCount: type.purchaseCount
  }));

  return {
    coins: coins,
    maxLevelUnlocked: maxLevelUnlocked,
    maxStageUnlocked: maxStageUnlocked,
    autoOpenBeds: autoOpenBeds,
    catsByStage: savedCats,
    upgrades: savedUpgrades,
    catTypes: savedCatTypes,
    volume: parseFloat(volumeSlider.value), // <-- FIX 2 & 3
    saveTime: Date.now() // Good to have
  };
}

function saveGame() {
  try {
    const data = getSaveData();
    localStorage.setItem("catEvolutionSave", JSON.stringify(data));
    // console.log("Game Saved!");
  } catch (e) {
    console.error("Failed to save game:", e);
  }
}

function loadGame() {
  const savedData = localStorage.getItem("catEvolutionSave");
  if (!savedData) {
     console.log("No save file found. Starting new game.");
     return false; // No save found
  }

  try {
    const data = JSON.parse(savedData);

    // 1. Restore simple state
    coins = data.coins || 0;
    maxLevelUnlocked = data.maxLevelUnlocked || 0;
    maxStageUnlocked = data.maxStageUnlocked || 0;
    autoOpenBeds = data.autoOpenBeds || false; // gets re-checked by trigger

    // --- FIX 2 & 3: Load Volume ---
    const volume = data.volume !== undefined ? data.volume : 0.1;
    volumeSlider.value = volume;
    volumeValue.textContent = (volume * 100).toFixed(0);
    if (bgMusic) bgMusic.volume = volume;
    // --- END FIX 2 & 3 ---

    // 2. Restore upgrade levels
    if (data.upgrades) {
      data.upgrades.forEach(savedUpg => {
        const gameUpg = upgrades.find(upg => upg.id === savedUpg.id);
        if (gameUpg) {
          gameUpg.level = savedUpg.level;
        }
      });
    }

    // 3. Restore cat prices
    if (data.catTypes) {
      data.catTypes.forEach(savedType => {
         const gameType = catTypes.find(t => t.level === savedType.level);
         if (gameType) {
            gameType.currentPrice = savedType.currentPrice;
            gameType.purchaseCount = savedType.purchaseCount;
         }
      });
    }

    // 4. Restore cats
    // Clear default bed (if any)
    bedsByStage[0].forEach(bed => bed.el.remove());
    bedsByStage = [[], [], []];

    if (data.catsByStage) {
      data.catsByStage.forEach((stage, stageIndex) => {
        if(stage) {
          stage.forEach(savedCat => {
            const newCat = spawnCat(savedCat.level, savedCat.x, savedCat.y, savedCat.stageIndex, false);
            if (newCat && savedCat.snackBuffEndTime && data.saveTime) {
                // Restore buff
                const remainingBuff = savedCat.snackBuffEndTime - data.saveTime;
                if (remainingBuff > 0) {
                   giveSnackToCat(newCat, remainingBuff); // Pass remaining duration
                }
            }
          });
        }
      });
    }

    // 5. Restore stages
    for(let i = 0; i <= maxStageUnlocked; i++) {
        if(document.getElementById(`stage-btn-${i}`)) {
            document.getElementById(`stage-btn-${i}`).style.display = "block";
        }
    }
    // Unlock upgrades based on stage
    if (maxStageUnlocked >= 1) {
        const autoMergeUpg = upgrades.find(upg => upg.id === "autoMerge");
        if (autoMergeUpg) autoMergeUpg.unlocked = true;

        const fishSnackUpg = upgrades.find(upg => upg.id === "fishSnack");
        if (fishSnackUpg) fishSnackUpg.unlocked = true;
    }

    // 6. Restart intervals from saved levels
    const deliveryUpg = upgrades.find(upg => upg.id === 'delivery');
    if (deliveryUpg && deliveryUpg.level > 0) {
      triggerDeliveryUpgrade(deliveryUpg.level);
    }

    const autoMergeUpg = upgrades.find(upg => upg.id === 'autoMerge');
    if (autoMergeUpg && autoMergeUpg.level > 0) {
      triggerAutoMergeUpgrade(autoMergeUpg.level);
    }

    const fishSnackUpg = upgrades.find(upg => upg.id === 'fishSnack');
    if (fishSnackUpg && fishSnackUpg.level > 0) {
      triggerFishSnackUpgrade(fishSnackUpg.level);
    }

    console.log("Game Loaded.");
    return true; // Load successful

  } catch (e) {
    console.error("Failed to load game:", e);
    localStorage.removeItem("catEvolutionSave"); // Corrupted save
    return false;
  }
}
// --- END FIX 4 ---


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

// --- *** NEW: Global Audio Initiator *** ---
// This function will be called ONCE on the first user interaction
// to get around browser autoplay policies.
function initiateMusicPlayback() {
  // console.log("User interaction detected, attempting to play music.");
  playMusic();
  
  // Crucially, remove the listeners after successful or failed attempt
  // so this only runs once.
  document.body.removeEventListener('mousedown', initiateMusicPlayback, { once: true });
  document.body.removeEventListener('touchstart', initiateMusicPlayback, { once: true });
  document.body.removeEventListener('keydown', initiateMusicPlayback, { once: true });
}

// Add listeners that will call the initiator function ONCE.
document.body.addEventListener('mousedown', initiateMusicPlayback, { once: true });
document.body.addEventListener('touchstart', initiateMusicPlayback, { once: true });
document.body.addEventListener('keydown', initiateMusicPlayback, { once: true });
// --- *** END: Global Audio Initiator *** ---


// --- Initial Setup & Event Listeners ---
// ... (rest of your script.js code)


// --- Initial Game Start ---

preloadImages(); // Start preloading immediately
// board.style.backgroundImage = `url('images/board/board1.png')`; // <-- OLD
setBoardBackground(0); // <-- NEW: This handles loading the image and setting size

// --- FIX 4: Load game ---
const saveLoaded = loadGame();
if (!saveLoaded) {
  // Only spawn default bed if no save was loaded
  spawnBed(220, 220, 0);
}
switchStage(currentStage); // Switch to saved stage
// --- END FIX 4 ---

// --- FIX 4: Auto-save ---
setInterval(saveGame, 5000); // Save every 5 seconds
window.addEventListener('beforeunload', saveGame); // Save on exit
// --- END FIX 4 ---


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
    optionsModal.style.display = "none"; // <-- FIX 3
  });
});

alertCloseBtn.addEventListener("click", () => alertModal.style.display = "none");

// Close modal if clicking outside content
window.addEventListener("click", (e) => {
  if (e.target == shopModal) shopModal.style.display = "none";
  if (e.target == upgradesModal) upgradesModal.style.display = "none";
  if (e.target == alertModal) alertModal.style.display = "none";
  if (e.target == resetModal) resetModal.style.display = "none";
  if (e.target == optionsModal) optionsModal.style.display = "none"; // <-- FIX 3
});

// Stage Button Listeners
stageBtns.forEach((btn, index) => {
  btn.addEventListener("click", () => switchStage(index));
});

// --- FIX 3: Options Modal Listeners ---
openOptionsBtn.addEventListener("click", () => {
  optionsModal.style.display = "flex";
});

volumeSlider.addEventListener("input", (e) => {
  const volume = parseFloat(e.target.value);
  if (bgMusic) {
    bgMusic.volume = volume;
  }
  volumeValue.textContent = (volume * 100).toFixed(0);
  // Removed the playMusic call here, it's covered by the global mousedown/touchstart/keydown listener.
});

resetBtn.addEventListener("click", () => {
  resetModal.style.display = "flex";
});
// --- END FIX 3 ---


// --- FIX 4: Reset Listeners ---
resetCancelBtn.addEventListener("click", () => {
  resetModal.style.display = "none";
});

// --- FIX 1: Modified reset handler ---
resetConfirmBtn.addEventListener("click", () => {
  console.log("Resetting game...");
  resetGameState(); // Manually reset all game state
  localStorage.removeItem("catEvolutionSave"); // Clear the save
  window.location.reload(); // Reload to start fresh
});
// --- END FIX 1 & 4 ---


// --- Automatic Animation Loop ---
// (Squish & Ball Drop)
setInterval(() => {
  const activeCats = catsByStage[currentStage];
  if (!activeCats || activeCats.length === 0) return;

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
  if (!activeCats) return;
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
  if (!item.el) {
    // Item was removed during drag (e.g., auto-merged)
    handleDragEnd();
    return;
  }
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

  // Check if item still exists (it might have been auto-merged)
  if (item && item.el) {
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
