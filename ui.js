// Helper Functions

function showModalAlert(message) {
  alertMessage.textContent = message;
  alertModal.style.display = "flex";
}

function unlockStage(stageIndex) {
  if (stageIndex > maxStageUnlocked) {
    maxStageUnlocked = stageIndex;
    document.getElementById(`stage-btn-${stageIndex}`).style.display = "block";
    showModalAlert(`Stage ${stageIndex + 1} Unlocked!`);

    // Unlock upgrades when Stage 2 is reached
    if (stageIndex === 1) {
      const autoMergeUpg = upgrades.find(upg => upg.id === "autoMerge");
      if (autoMergeUpg) autoMergeUpg.unlocked = true;

      const fishSnackUpg = upgrades.find(upg => upg.id === "fishSnack");
      if (fishSnackUpg) fishSnackUpg.unlocked = true;

      showModalAlert("New Upgrades Unlocked: Auto Merge & Fish Snack!");
    }
  }
}

// Core Game Loop
// This function ONLY updates the coin text display
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

// Stage Management
// Board resizing logic 
let currentBoardRatio = 1; // Store the aspect ratio globally

// function to load image, set ratio, and resize
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

// function to apply board size based on current width and ratio
function resizeBoard() {
  if (!boardWrapper) return;
  // Get the computed width (handles 500px on desktop, 90vw on mobile, etc.)
  const currentWrapperWidthStyle = window.getComputedStyle(boardWrapper).width;
  const currentWrapperWidth = parseFloat(currentWrapperWidthStyle.replace('px', ''));

  // Set the new height based on the width and stored ratio
  const newHeight = currentWrapperWidth * currentBoardRatio;
  boardWrapper.style.height = `${newHeight}px`;
}

// Add resize listener to handle window resizing
window.addEventListener('resize', resizeBoard);

function switchStage(newStage) {
  if (newStage > maxStageUnlocked) return;

  currentStage = newStage;

  // Change board background based on stage
  setBoardBackground(newStage); // This function handles loading and resizing

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

  // Show/Hide Fish Snacks (by stageIndex)
  activeFishSnacks.forEach(snack => {
    snack.el.style.display = (newStage === snack.stageIndex) ? "block" : "none";
  });

  // Note: renderShop() and renderUpgrades() are called when modals are opened
}


// UI Rendering
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


function renderShop() {
  const shopContainer = document.getElementById("shopItems");
  shopContainer.innerHTML = "";

  // Shop is global.
  // You can buy cats up to 3 levels below your max level.
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

    // Determine the cat's home stage
    const targetStage = getStageForLevel(catToShow.level);

    // Update button text to show target stage AND purchase count
    // Format income to 1 decimal place
    btn.innerHTML = `Buy ${catToShow.name} (Stage ${targetStage + 1})
                     <br>Cost: ${price.toLocaleString()}
                     <br>Income: ${catToShow.income.toFixed(1)}/s
                     <br>Purchased: ${catToShow.purchaseCount.toLocaleString()}`;

    // Check entity count for the target stage
    btn.disabled = coins < price || getEntityCount(targetStage) >= MAX_ENTITIES;
    btn.dataset.cost = price; 
    btn.dataset.stage = targetStage; 

    btn.addEventListener("click", () => {
      // Check entity count for the target stage again
      if (coins < price || getEntityCount(targetStage) >= MAX_ENTITIES) {
         if (getEntityCount(targetStage) >= MAX_ENTITIES) {
            showModalAlert(`Stage ${targetStage + 1} is full! Merge cats to make space.`);
         }
         return;
      }

      const rect = board.getBoundingClientRect();
      const rx = Math.random() * (rect.width - 64);
      const ry = Math.random() * (rect.height - 64);

      // Spawn cat on the target stage
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

// Animation Functions
function dropBall(cat) {
  const catElement = cat.el;
  const stageIndex = cat.stageIndex;

  // Add check
  if (!catElement || catElement.style.display === 'none') return;

  const ball = document.createElement("div");
  ball.className = "coin-ball";
  // Set ball image based on the cat's stage
  ball.style.backgroundImage = `url('images/balls/ball${stageIndex + 1}.png')`;


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


// Image Preloading Function
function preloadImages() {
  const imagesToLoad = [];

  // Cat Images (Levels 1 through 15)
  for (let i = 1; i <= catTypes.length; i++) {
    imagesToLoad.push(`images/cats/${i}.png`);
  }

  // Other Core Assets
  imagesToLoad.push('images/cats/bed.png');
  imagesToLoad.push('images/balls/ball1.png'); // MODIFIED: Keep .png (lowercase)
  imagesToLoad.push('images/balls/ball2.png'); // MODIFIED: Preload new balls
  imagesToLoad.push('images/balls/ball3.png'); // MODIFIED: Preload new balls
  imagesToLoad.push('images/coin.png'); // MODIFIED: Preload coin

  // Stage Backgrounds
  imagesToLoad.push('images/board/board1.png');
  imagesToLoad.push('images/board/board2.png');
  imagesToLoad.push('images/board/board3.png');

  // Upgrade Assets
  imagesToLoad.push('images/upgrades/fish.png');


  let loadedCount = 0;
  const totalCount = imagesToLoad.length;

  imagesToLoad.forEach(src => {
    const img = new Image();
    // This line starts the download request
    img.src = src;
    img.onload = () => {
      loadedCount++;
      if (loadedCount === totalCount) {
        console.log("All game assets preloaded.");
      }
    };
    img.onerror = () => {
      console.error(`Failed to load image: ${src}`);
    };
  });
}