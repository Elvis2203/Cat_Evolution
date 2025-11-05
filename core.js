// Play Music Function (This is the only place we call .play())
function playMusic() {
  if (isMusicStarted || !bgMusic) return;
  // Scale slider value (0-1) to actual volume (0-0.2)
  bgMusic.volume = parseFloat(volumeSlider.value) / 5.0;
  bgMusic.play().then(() => {
    isMusicStarted = true;
  }).catch(e => {
    // This is expected if the user interaction wasn't trusted (e.g., programmatic click)
    console.warn("Audio play failed, user must interact directly with a trusted element first.", e);
  });
}
//

// Coin update loop 
// Coin update runs 10 times per second (100ms)
setInterval(() => {
  let incomeThisTick = 0; // This is the total PER-SECOND income rate

  // Iterate with stage index
  for (let i = 0; i < catsByStage.length; i++) {
    const stage = catsByStage[i];
    const isStageVisible = (i === currentStage);

    stage.forEach(cat => {
      const catIncome = catTypes[cat.level - 1].income; // This is now a float

      // Check for fish snack buff
      if (cat.snackBuffEndTime && Date.now() < cat.snackBuffEndTime) {
        // Buff is active!
        // Add 10x its income to the per-second rate
        incomeThisTick += catIncome * 10;

        // Only animate if cat is on the current stage
        if (isStageVisible) {
            triggerCatSquish(cat);
            dropBall(cat); // MODIFIED: Pass cat object
        }

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
      // End of buff check
    });
  } 

  // Add 1/10th of the total per-second rate to coins
  coins += (incomeThisTick / 10);
  coinsPerSec = incomeThisTick; // This will correctly show the 10x rate

  // Only update the text, don't re-render all buttons
  updateCoinDisplay();

  // Update modal button states
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
}, 100);
// END MODIFIED: Coin update loop


// Modified triggerDeliveryUpgrade
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

function triggerAutoMergeUpgrade(newLevel) {
  if (autoMergeInterval) clearInterval(autoMergeInterval);

  // Cooldown = 9 - level (min 1 second)
  const cooldownMs = Math.max(1000, (9 - newLevel) * 1000);

  autoMergeInterval = setInterval(autoMergeCats, cooldownMs);
}


function triggerFishSnackUpgrade(newLevel) {
  if (fishSnackInterval) clearInterval(fishSnackInterval);

  // Cooldown = 130 - (10 * level) (min 10 seconds)
  const cooldownMs = Math.max(10000, (130 - (10 * newLevel)) * 1000);

  // Spawn one immediately on first purchase
  if (newLevel === 1) spawnFishSnack();

  fishSnackInterval = setInterval(spawnFishSnack, cooldownMs);
}


// Save & Load Functions 

// New function to manually reset state 
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

  // Reset Volume
  volumeSlider.value = 0.5;
  volumeValue.textContent = "50";
  if (bgMusic) bgMusic.volume = 0.5 / 5.0;
}

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
    sliderValue: parseFloat(volumeSlider.value),
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

    // MODIFIED: Load the sliderValue (default 0.5), then calculate actual volume
    const sliderValue = data.sliderValue !== undefined ? data.sliderValue : 0.5;
    volumeSlider.value = sliderValue;
    volumeValue.textContent = (sliderValue * 100).toFixed(0);
    if (bgMusic) bgMusic.volume = sliderValue / 5.0;

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


// Global Audio Initiator
// This function will be called ONCE on the first user interaction
// to get around browser autoplay policies.
function initiateMusicPlayback() {
  // console.log("User interaction detected, attempting to play music.");
  playMusic();
  
  // Remove the listeners after successful or failed attempt
  // so this only runs once.
  document.body.removeEventListener('mousedown', initiateMusicPlayback, { once: true });
  document.body.removeEventListener('touchstart', initiateMusicPlayback, { once: true });
  document.body.removeEventListener('keydown', initiateMusicPlayback, { once: true });
}


// Automatic Animation Loop
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
         dropBall(cat); // MODIFIED: Pass cat object
      }
    }
  });
}, 1500); // Runs every 1.5 second


// Cat Idle Movement Loop
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