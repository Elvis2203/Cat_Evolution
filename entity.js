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

// Entity Spawning 
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
  if (!catType) {
    console.error(`Invalid cat level ${level}. Cannot spawn.`);
    return null;
  }
  const cat = {
    id: nextId++,
    level, x, y, stageIndex,
    snackBuffEndTime: null, // Property for fish snack
    el: document.createElement("div")
  };

  cat.el.className = "cat";
  cat.el.style.backgroundImage = `url('images/cats/${level}.png')`;
  cat.el.style.left = `${x}px`;
  cat.el.style.top = `${y}px`;
  cat.el.dataset.id = cat.id;
  cat.el.style.display = (stageIndex === currentStage) ? "flex" : "none";

  // Spawn Animation 
  if (fromMerge) {
    cat.el.classList.add("cat-spawn");
    setTimeout(() => {
      if (cat.el) cat.el.classList.remove("cat-spawn");
    }, 400); // Animation duration
  }

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
    dropBall(cat);
  });

  makeDraggable(cat);
  return cat;
}

// Entity Interaction makeDraggable (Refactored for Touch and Mouse)
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


// Modified mergeCats for Stage Ascension
function mergeCats(catA, catB) {
  const newLevel = catA.level + 1;
  const oldStage = catA.stageIndex;
  const newStage = getStageForLevel(newLevel);

  const spawnX = (catA.x + catB.x) / 2;
  const spawnY = (catA.y + catB.y) / 2;

  // Remove cats from state array immediately
  catsByStage[oldStage] = catsByStage[oldStage].filter(c => c.id !== catA.id && c.id !== catB.id);

  // Pre-spawn new cat for stable c/s 
  let newCat = null;
  const isFirstTimeUnlock = (newStage > maxStageUnlocked); // Check before unlockStage

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


  // Add merging class to trigger CSS animation
  // (Stage Ascend): Check for first time unlock
  if (isFirstTimeUnlock) {
      catA.el.classList.add("cat-ascending");
      catB.el.classList.add("cat-ascending");
  } else {
      catA.el.classList.add("cat-merging");
      catB.el.classList.add("cat-merging");
  }

  // Calculate translation to center point
  const deltaXA = spawnX - catA.x;
  const deltaYA = spawnY - catA.y;
  const deltaXB = spawnX - catB.x;
  const deltaYB = spawnY - catB.y;

  // Apply transform
  if (isFirstTimeUnlock) {
      // Don't move to center. Just expand and fade in place.
      catA.el.style.transform = `scale(5)`;
      catB.el.style.transform = `scale(5)`;
  } else {
      // Original logic: move to center and shrink
      catA.el.style.transform = `translate(${deltaXA}px, ${deltaYA}px) scale(0.1)`;
      catB.el.style.transform = `translate(${deltaXB}px, ${deltaYB}px) scale(0.1)`;
  }
  catA.el.style.opacity = 0;
  catB.el.style.opacity = 0;

  // Use setTimeout to wait for animation to finish
  // (Stage Ascend): Use longer duration for ascend
  const animationDuration = isFirstTimeUnlock ? 1500 : 500; // 1.5s for ascend, 0.5s for normal merge

  setTimeout(() => {
    // Remove old cat elements
    catA.el.remove();
    catB.el.remove();

    // (Stage Ascend): Switch stage if first time
    if (isFirstTimeUnlock) {
        switchStage(newStage); // Auto-switch to new stage
    }

    // Reveal pre-spawned cat
    if (newCat) {
        newCat.el.style.visibility = 'visible';
        newCat.el.style.pointerEvents = 'auto';

        // Re-trigger spawn animation (spawnCat already did it, but it was hidden)
        newCat.el.classList.add("cat-spawn");
        setTimeout(() => {
           if (newCat.el) newCat.el.classList.remove("cat-spawn");
        }, 400);
    }
  }, animationDuration);
}


// Upgrade Functions
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


// Modified spawnFishSnack
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

// makeSnackDraggable (Refactored for Touch and Mouse)
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

// Modified checkSnackDrop 
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

// Modified to accept duration
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