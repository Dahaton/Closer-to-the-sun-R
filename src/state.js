export const RECIPES = [
  {
    id: 1,
    displayName: "Steel Wings",
    codeName: "SteelWings",
    tier: 1,
    speed: 1200,
    durability: 3,
    dragFactor: 1.8,
    tokyoDrift: 128,
    icon: "t1f.png",
    requirements: { fabric1: 2, steel1: 1, wood1: 1 }
  },
  {
    id: 2,
    displayName: "Durable Steel Wings",
    codeName: "DurableSteelWings",
    tier: 1,
    speed: 1000,
    durability: 5,
    dragFactor: 2.1,
    tokyoDrift: 128,
    icon: "t1h.png",
    requirements: { fabric1: 1, steel1: 2, wood1: 1 }
  },
  {
    id: 3,
    displayName: "Super Durable Steel Wings",
    codeName: "SuperDurableSteelWings",
    tier: 1.5,
    speed: 1150,
    durability: 6,
    dragFactor: 1.7,
    tokyoDrift: 1,
    icon: "t15h.png",
    requirements: { fabric1: 1, steel1: 3, wood1: 2 }
  },
  {
    id: 4,
    displayName: "Super Steel Wings",
    codeName: "SuperSteelWings",
    tier: 1.5,
    speed: 1350,
    durability: 4,
    dragFactor: 1.6,
    tokyoDrift: 1,
    icon: "t15f.png",
    requirements: { fabric1: 3, steel1: 1, wood1: 2 }
  },
  {
    id: 5,
    displayName: "Enchanted Wings",
    codeName: "EnchantedWings",
    tier: 2,
    speed: 1450,
    durability: 7,
    skipTargetZ: 25000,
    skipFeathers: 4,
    dragFactor: 1.35,
    tokyoDrift: 1,
    icon: "t2f.png",
    requirements: { fabric2: 2, steel2: 1, wood2: 1 }
  },
  {
    id: 6,
    displayName: "Durable Enchanted Wings",
    codeName: "DurableEnchantedWings",
    tier: 2,
    speed: 1250,
    durability: 9,
    skipTargetZ: 25000,
    skipFeathers: 4,
    dragFactor: 1.45,
    tokyoDrift: 1,
    icon: "t2h.png",
    requirements: { fabric2: 1, steel2: 2, wood2: 1 }
  },
  {
    id: 7,
    displayName: "Durable Super Enchanted Wings",
    codeName: "SuperDurableEnchantedWings",
    tier: 2.5,
    speed: 1300,
    durability: 10,
    skipTargetZ: 50000,
    skipFeathers: 5,
    dragFactor: 1.3,
    tokyoDrift: 1,
    icon: "t25h.png",
    requirements: { fabric2: 1, steel2: 3, wood2: 2 }
  },
  {
    id: 8,
    displayName: "Super Enchanted Wings",
    codeName: "SuperEnchantedWings",
    tier: 2.5,
    speed: 1500,
    durability: 8,
    skipTargetZ: 50000,
    skipFeathers: 5,
    dragFactor: 1.2,
    tokyoDrift: 1,
    icon: "t25f.png",
    requirements: { fabric2: 3, steel2: 1, wood2: 2 }
  },
  {
    id: 9,
    displayName: "Mythril Wings",
    codeName: "MythrilWings",
    tier: 3,
    speed: 1600,
    durability: 9,
    skipTargetZ: 80000,
    skipFeathers: 6,
    dragFactor: 0.95,
    tokyoDrift: 1,
    icon: "t3f.png",
    requirements: { fabric3: 3, steel3: 1, wood3: 2 }
  },
  {
    id: 10,
    displayName: "Durable Mythril Wings",
    codeName: "DurableMythrilWings",
    tier: 3,
    speed: 1450,
    durability: 11,
    skipTargetZ: 80000,
    skipFeathers: 6,
    dragFactor: 1.0,
    tokyoDrift: 1,
    icon: "t3h.png",
    requirements: { fabric3: 1, steel3: 3, wood3: 2 }
  },
  {
    id: 11,
    displayName: "Wax Wings",
    codeName: "WaxWings",
    tier: 4,
    speed: 1750,
    durability: 14,
    skipTargetZ: 110000,
    skipFeathers: 7,
    dragFactor: 0.75,
    tokyoDrift: 1,
    icon: "t4.png",
    requirements: { wax: 4 }
  }
];

const SAVE_KEY = "cts_save_data";

export const state = {
  language: 'en',
  controlType: 'keyboard',
  musicVolume: 0,
  soundVolume: 0,
  hasSelectedInitialSettings: false,

  isPaused: false,
  showDebug: false,

  inventory: {
    coin: 0,
    fabric1: 2,
    fabric2: 0,
    fabric3: 0,
    steel1: 1,
    steel2: 0,
    steel3: 0,
    wood1: 1,
    wood2: 0,
    wood3: 0,
    wax: 0
  },

  currentTier: 1,
  currentRecipeIndex: 0,
  highScore: 0,

  equippedWings: "",
  equippedWingsDisplayName: "None",
  wingsSpeed: 1200,
  wingsDurability: 4,
  wingsTokyoDrift: 128,

  staminaCounter: 4,
  purpleFeathersCount: 0,
  cameraAngle: 0,
  distanceOffset: 275,
  isSkippingTier: false,

  hasSeenIntroDialogue: false,
  hasSeenTutorial: false,
  endlessUnlocked: false,
  hasSaveData: false,

  inDialogue: false,
  interactingWithUI: false,
  currentScene: "LanguageSelect",
  lastRunSummary: null
};

export function saveState() {
  const saveData = {
    inventory: state.inventory,
    currentTier: state.currentTier,
    currentRecipeIndex: state.currentRecipeIndex,
    highScore: state.highScore,
    equippedWings: state.equippedWings,
    equippedWingsDisplayName: state.equippedWingsDisplayName,
    wingsSpeed: state.wingsSpeed,
    wingsDurability: state.wingsDurability,
    wingsTokyoDrift: state.wingsTokyoDrift,
    hasSeenIntroDialogue: state.hasSeenIntroDialogue,
    hasSeenTutorial: state.hasSeenTutorial,
    endlessUnlocked: state.endlessUnlocked,
    language: state.language,
    controlType: state.controlType,
    musicVolume: state.musicVolume,
    soundVolume: state.soundVolume,
    hasSelectedInitialSettings: state.hasSelectedInitialSettings
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
  state.hasSaveData = true;
}

export function loadState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) {
    const data = JSON.parse(raw);
    if (data.inventory) Object.assign(state.inventory, data.inventory);
    if (data.currentTier !== undefined) state.currentTier = data.currentTier;
    if (data.currentRecipeIndex !== undefined) state.currentRecipeIndex = data.currentRecipeIndex;
    if (data.highScore !== undefined) state.highScore = data.highScore;
    if (data.equippedWings !== undefined) state.equippedWings = data.equippedWings;
    if (data.equippedWingsDisplayName !== undefined) state.equippedWingsDisplayName = data.equippedWingsDisplayName;
    if (data.wingsSpeed !== undefined) state.wingsSpeed = data.wingsSpeed;
    if (data.wingsDurability !== undefined) state.wingsDurability = data.wingsDurability;
    if (data.wingsTokyoDrift !== undefined) state.wingsTokyoDrift = data.wingsTokyoDrift;
    if (data.hasSeenIntroDialogue !== undefined) state.hasSeenIntroDialogue = data.hasSeenIntroDialogue;
    if (data.hasSeenTutorial !== undefined) state.hasSeenTutorial = data.hasSeenTutorial;
    if (data.endlessUnlocked !== undefined) state.endlessUnlocked = data.endlessUnlocked;
    if (data.language !== undefined) state.language = data.language;
    if (data.controlType !== undefined) state.controlType = data.controlType;
    if (data.musicVolume !== undefined) state.musicVolume = data.musicVolume;
    if (data.soundVolume !== undefined) state.soundVolume = data.soundVolume;
    if (data.hasSelectedInitialSettings !== undefined) state.hasSelectedInitialSettings = data.hasSelectedInitialSettings;

    state.staminaCounter = state.wingsDurability || 4;
    state.hasSaveData = true;
    return true;
  }
  state.hasSaveData = false;
  return false;
}

export function clearSave() {
  localStorage.removeItem(SAVE_KEY);

  state.inventory = {
    coin: 0,
    fabric1: 2,
    fabric2: 0,
    fabric3: 0,
    steel1: 1,
    steel2: 0,
    steel3: 0,
    wood1: 1,
    wood2: 0,
    wood3: 0,
    wax: 0
  };
  state.currentTier = 1;
  state.currentRecipeIndex = 0;
  state.highScore = 0;
  state.equippedWings = "";
  state.equippedWingsDisplayName = "None";
  state.wingsSpeed = 1200;
  state.wingsDurability = 4;
  state.wingsTokyoDrift = 128;
  state.staminaCounter = 4;
  state.purpleFeathersCount = 0;
  state.hasSeenIntroDialogue = false;
  state.hasSeenTutorial = false;
  state.endlessUnlocked = false;
  state.hasSelectedInitialSettings = false;
  state.hasSaveData = false;
}

export function debugUnlockAll() {
  state.currentTier = 4;
  for (const key of Object.keys(state.inventory)) {
    state.inventory[key] = 999;
  }
  saveState();
}

export function canCraftRecipe(recipe) {
  if (!recipe || !recipe.requirements) return false;
  for (const [item, count] of Object.entries(recipe.requirements)) {
    if ((state.inventory[item] || 0) < count) return false;
  }
  return true;
}

export function craftAndEquip(recipe) {
  if (!canCraftRecipe(recipe)) return false;

  for (const [item, count] of Object.entries(recipe.requirements)) {
    state.inventory[item] -= count;
  }

  state.equippedWings = recipe.codeName;
  state.equippedWingsDisplayName = recipe.displayName;
  state.wingsSpeed = recipe.speed;
  state.wingsDurability = recipe.durability;
  state.wingsTokyoDrift = recipe.tokyoDrift;
  state.staminaCounter = recipe.durability;
  state.purpleFeathersCount = 0;

  saveState();
  return true;
}

export function buyItem(itemKey) {
  if (state.inventory.coin >= 1) {
    state.inventory.coin -= 1;
    state.inventory[itemKey] = (state.inventory[itemKey] || 0) + 1;
    saveState();
    return true;
  }
  return false;
}

export function sellItem(itemKey) {
  if ((state.inventory[itemKey] || 0) >= 1) {
    state.inventory[itemKey] -= 1;
    state.inventory.coin += 1;
    saveState();
    return true;
  }
  return false;
}

export function addLoot(itemKey, amount = 1) {
  if (itemKey === "coin") {
    state.inventory.coin += amount;
  } else if (state.inventory.hasOwnProperty(itemKey)) {
    state.inventory[itemKey] += amount;
  }
  saveState();
}

loadState();