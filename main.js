// Add listeners that will call the initiator function ONCE.
document.body.addEventListener('mousedown', initiateMusicPlayback, { once: true });
document.body.addEventListener('touchstart', initiateMusicPlayback, { once: true });
document.body.addEventListener('keydown', initiateMusicPlayback, { once: true });
// END: Global Audio Initiator
// Initial Setup & Event Listeners
// Initial Game Start

preloadImages(); // Start preloading immediately
setBoardBackground(0); // This handles loading the image and setting size

// Load game
const saveLoaded = loadGame();
if (!saveLoaded) {
  // Only spawn default bed if no save was loaded
  spawnBed(220, 220, 0);
}
switchStage(currentStage); // Switch to saved stage

// Auto-save
setInterval(saveGame, 5000); // Save every 5 seconds
window.addEventListener('beforeunload', saveGame); // Save on exit


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

// Options Modal Listeners
openOptionsBtn.addEventListener("click", () => {
  optionsModal.style.display = "flex";
});

volumeSlider.addEventListener("input", (e) => {
  // Get sliderValue and scale it for actual volume
  const sliderValue = parseFloat(e.target.value);
  if (bgMusic) {
    bgMusic.volume = sliderValue / 5.0;
  }
  volumeValue.textContent = (sliderValue * 100).toFixed(0);
  // Removed the playMusic call here, it's covered by the global mousedown/touchstart/keydown listener.
});

resetBtn.addEventListener("click", () => {
  resetModal.style.display = "flex";
});


// Reset Listeners 
resetCancelBtn.addEventListener("click", () => {
  resetModal.style.display = "none";
});

resetConfirmBtn.addEventListener("click", () => {
  console.log("Resetting game...");
  resetGameState(); // Manually reset all game state
  localStorage.removeItem("catEvolutionSave"); // Clear the save
  window.location.reload(); // Reload to start fresh
});



// GLOBAL DRAG HANDLERS (for Touch and Mouse)
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

// Global Mouse Listeners
document.addEventListener("mousemove", (e) => {
  handleDragMove(e.clientX, e.clientY);
});
document.addEventListener("mouseup", () => {
  handleDragEnd();
});

// Global Touch Listeners
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