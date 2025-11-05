// DOM Elements
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

// Options Modal Elements
const openOptionsBtn = document.getElementById("open-options-btn");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");
const resetBtn = document.getElementById("reset-btn"); // This is now the button inside the options modal

// Stage Buttons
const stageBtns = document.querySelectorAll(".stage-btn");

// Game State
const MAX_ENTITIES = 15;
let coins = 0.0; 
let coinsPerSec = 0.0; 
let nextId = 1;
let deliveryInterval = null;
let maxLevelUnlocked = 0;
let autoOpenBeds = false;
let isMusicStarted = false; 

// Bed Timer State
let bedTimerInterval = null;
let deliveryIntervalMs = 0;
let nextBedSpawnTime = 0;

// Upgrade Intervals
let autoMergeInterval = null;
let fishSnackInterval = null;
let activeFishSnacks = [];


// Staged State 
let currentStage = 0;
let maxStageUnlocked = 0;
let catsByStage = [[], [], []]; // Array of arrays for cats
let bedsByStage = [[], [], []]; // Array of arrays for beds

// Global Drag State (for touch and mouse) 
let draggedItem = null; // Will be { type: 'cat' | 'snack', item: cat | snack }
let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;