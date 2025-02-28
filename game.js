// Core game state and logic for the Fantasy Guild Manager game
// Manages player resources, heroes, dungeons, and progression mechanics.

// Global game state object, storing key game data
const gameState = {
  gold: 250,              // Initial gold amount for the player
  cycle: "day",          // Current time cycle (day or night)
  heroes: [],            // Array of hero objects in the guild
  formation: Array(9).fill(null), // 3x3 grid for hero positioning, initially empty
  selectedHero: null,    // Currently selected hero ID for actions
  selectedDungeon: null, // Currently selected dungeon for missions
  battleSpeed: 1,        // Default battle speed multiplier (0.5x, 1x, 2x, 4x)
  casualties: [],        // Array of hero IDs lost during battles
};

/**
 * Defines the base characteristics for each hero class in the game.
 * @type {Array<Object>}
 */
const heroClasses = [
  {
    type: "warrior",         // Hero class identifier
    name: "Warrior",         // Display name
    hp: 100,                 // Base hit points
    attack: 20,              // Base attack damage
    special: "Shield Bash",  // Unique special ability
    cost: 100,               // Gold cost to recruit
    passive: "Ironclad Resilience", // Passive ability name
    hitChance: 0.8,          // Probability of landing an attack (80%)
  },
  {
    type: "archer",
    name: "Archer",
    hp: 80,
    attack: 20,
    special: "Multi Shot",
    cost: 120,
    passive: "Deadly Precision",
    hitChance: 0.8,
  },
  {
    type: "mage",
    name: "Mage",
    hp: 50,
    attack: 25,
    special: "Fireball",
    cost: 150,
    passive: "Arcane Potency",
    hitChance: 0.8,
  },
  {
    type: "cleric",
    name: "Cleric",
    hp: 60,
    attack: 10,
    special: "Heal",
    cost: 140,
    passive: "Divine Restoration",
    hitChance: 0.8,
  },
];

/**
 * Generates a random fantasy hero name based on the hero class.
 * @param {string} className - The name of the hero class (e.g., "Warrior").
 * @returns {string} A randomly generated hero name (e.g., "Aric the Brave").
 */
function generateHeroName(className) {
  // Arrays of first and last names for generating unique hero names
  const firstNames = [
    "Aric", "Bron", "Cael", "Dorn", "Elric", "Finn", "Gorm", "Harn", "Irwin", "Jace",
  ];
  const lastNames = [
    "the Brave", "the Swift", "the Wise", "the Strong", "the Bold", "Darkblade", "Lightbringer", "Stormcaller",
  ];
  // Combine a random first name and last name
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
    lastNames[Math.floor(Math.random() * lastNames.length)]
  }`;
}

/**
 * Defines passive abilities for each hero class, including their effects and applicability.
 * @type {Array<Object>}
 */
const heroPassives = [
  {
    name: "Ironclad Resilience",     // Passive ability name
    description: "Reduces incoming damage by 15%", // Description for UI
    type: "damageReduction",         // Type of effect
    value: 0.85,                     // Multiplier for damage reduction (15% less damage)
    appliesTo: ["warrior"],          // Classes this passive applies to
    apply: function (hero, target, damage) {
      // Apply damage reduction and round to the nearest whole number
      return Math.round(damage * this.value); // Ensure integer damage for consistency
    },
  },
  {
    name: "Deadly Precision",
    description: "Increases hit chance by 10%",
    type: "hitChanceBoost",
    value: 0.1,                     // Additive increase to hit chance (10%)
    appliesTo: ["archer"],
    apply: function (hero) {
      // Cap hit chance at 100% and return the boosted value
      return Math.min(1.0, hero.hitChance + this.value);
    },
  },
  {
    name: "Arcane Potency",
    description: "Increases attack and special damage by 15%",
    type: "damageBoost",
    value: 1.15,                    // Multiplier for damage increase (15% more)
    appliesTo: ["mage"],
    apply: function (hero, damage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(damage * this.value);
    },
  },
  {
    name: "Divine Restoration",
    description: "Heals all injured allies for 50% of attack per turn",
    type: "heal",
    value: 0.4,                     // Healing multiplier (50% of attack)
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      // Heal all injured allies by 50% of the hero's attack, rounding values
      formationHeroes.forEach((ally) => {
        if (ally.hp < ally.maxHp) {
          const healAmount = Math.round(hero.attack * this.value);
          ally.hp = Math.min(ally.maxHp, Math.round(ally.hp + healAmount)); // Cap at max HP
        }
      });
    },
  },
];

/**
 * Defines special abilities for each hero class, including their effects and cooldowns.
 * @type {Array<Object>}
 */
const heroSkills = [
  {
    name: "Shield Bash",
    description: "Deals 25% more damage than base attack",
    type: "damage",
    value: 1.25,                    // Damage multiplier (25% more)
    cooldown: 2,                    // Turns before the skill can be used again
    appliesTo: ["warrior"],
    apply: function (hero, target, baseDamage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Multi Shot",
    description: "Deals 40% more damage than base attack",
    type: "damage",
    value: 1.4,                     // Damage multiplier (40% more)
    cooldown: 2,
    appliesTo: ["archer"],
    apply: function (hero, target, baseDamage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Fireball",
    description: "Deals 50% more damage than base attack",
    type: "damage",
    value: 1.5,                     // Damage multiplier (50% more)
    cooldown: 2,
    appliesTo: ["mage"],
    apply: function (hero, target, baseDamage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Heal",
    description: "Heals a random injured ally for 100% of attack",
    type: "heal",
    value: 1.0,                     // Healing multiplier (100% of attack)
    cooldown: 2,
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      // Find injured allies and heal a random one with 100% of attack, rounding values
      const injuredAllies = formationHeroes.filter((ally) => ally.hp < ally.maxHp);
      if (injuredAllies.length > 0) {
        const healTarget = injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
        const healAmount = Math.round(hero.attack * this.value);
        healTarget.hp = Math.min(healTarget.maxHp, Math.round(healTarget.hp + healAmount)); // Cap at max HP
      }
    },
  },
];

// XP thresholds required for heroes to level up
const xpThresholds = [0, 10, 25, 60, 120, 250];

/**
 * Levels up a hero if they have sufficient XP, increasing stats and resetting XP.
 * @param {Object} hero - The hero object to potentially level up.
 */
function levelUpHero(hero) {
  const currentLevel = hero.level; // Current hero level
  const maxLevel = xpThresholds.length - 1; // Maximum possible level
  if (currentLevel >= maxLevel) return; // Prevent leveling beyond the max

  // Check if hero has enough XP to level up
  if (hero.xp >= xpThresholds[currentLevel]) {
    hero.xp = 0; // Reset XP after leveling
    hero.level++; // Increment level
    hero.maxHp += 10; // Increase maximum health
    hero.hp = Math.min(hero.maxHp, hero.hp + 10); // Restore and cap health
    hero.attack += 2; // Increase attack power
    addLogEntry("xp-level", `${hero.name} leveled up to Level ${hero.level}!`); // Log the level-up
  }
}

/**
 * Defines available dungeons with their difficulties, enemies, and rewards.
 * @type {Array<Object>}
 */
const dungeons = [
  {
    name: "Forest Ruins",          // Dungeon name
    description: "An abandoned ruin in the heart of the forest.", // Dungeon description
    difficulty: "Easy",            // Difficulty level
    reward: 200,                   // Gold reward for completion
    roomCount: 3,                  // Number of rooms in the dungeon
    enemyCountOnRoom: { min: 3, max: 5 }, // Range of enemies per room
    enemies: ["goblin", "kobold", "wolf"], // Regular enemy types
    enemyStats: { hp: 40, damage: 12, hitChance: 0.8 }, // Stats for regular enemies
    enemyXp: 1,                    // XP reward per regular enemy
    bosses: ["Goblin Warlord", "Ancient Treant"], // Boss enemy types
    bossStats: { hp: 200, damage: 30, hitChance: 0.8 }, // Stats for bosses
    bossCount: { min: 1, max: 1 }, // Range of bosses in the boss room
    bossXP: 3,                     // XP reward per boss
  },
  {
    name: "Dark Caverns",
    description: "Ancient caves filled with eerie undead.",
    difficulty: "Medium",
    reward: 400,
    roomCount: 5,
    enemyCountOnRoom: { min: 4, max: 6 },
    enemies: ["skeleton", "ghoul", "shadow"],
    enemyStats: { hp: 60, damage: 20, hitChance: 0.8 },
    enemyXp: 2,
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossStats: { hp: 300, damage: 50, hitChance: 0.8 },
    bossCount: { min: 1, max: 1 },
    bossXP: 4,
  },
  {
    name: "Dragon's Lair",
    description: "A perilous lair guarded by a fearsome dragon.",
    difficulty: "Hard",
    reward: 800,
    roomCount: 7,
    enemyCountOnRoom: { min: 5, max: 7 },
    enemies: ["dragon", "wyvern", "demon"],
    enemyStats: { hp: 100, damage: 30, hitChance: 0.8 },
    enemyXp: 3,
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossStats: { hp: 500, damage: 75, hitChance: 0.8 },
    bossCount: { min: 1, max: 2 },
    bossXP: 5,
  },
];

/**
 * Adds a new hero to the game state and updates the UI.
 * @param {Object} hero - The hero object to add to the guild.
 */
function addHero(hero) {
  // Add the hero to the global heroes array
  gameState.heroes.push(hero);
  renderHeroRoster(); // Refresh the hero roster display
  updateUI(); // Update all UI elements to reflect the change
}

/**
 * Generates a new hero with random characteristics based on hero classes.
 * @returns {Object} A new hero object with unique ID, name, and stats.
 */
function generateHero() {
  // Randomly select a hero class from the available options
  const classIndex = Math.floor(Math.random() * heroClasses.length);
  const heroClass = heroClasses[classIndex];
  return {
    id: Date.now() + Math.random().toString(36).substring(2, 9), // Unique ID using timestamp and random string
    name: generateHeroName(heroClass.name), // Generate a random fantasy name
    class: heroClass.type,                 // Hero class type (e.g., "warrior")
    hp: heroClass.hp,                     // Base hit points
    maxHp: heroClass.hp,                  // Maximum hit points
    attack: heroClass.attack,             // Base attack damage
    special: heroClass.special,           // Special ability name
    level: 1,                             // Starting level
    cost: heroClass.cost,                 // Recruitment cost in gold
    passive: heroClass.passive,           // Passive ability name
    cooldown: 0,                          // Initial cooldown for specials
    xp: 0,                                // Starting experience points
    hitChance: heroClass.hitChance,       // Probability of landing attacks
  };
}

/**
 * Checks if a hero is currently placed in the formation grid.
 * @param {Object} hero - The hero object to check.
 * @returns {boolean} True if the hero is in the formation, false otherwise.
 */
function isHeroInFormation(hero) {
  // Check if the hero’s ID exists in any formation slot
  return gameState.formation.some((slot) => slot === hero.id);
}

/**
 * Determines if the player achieved victory in a dungeon mission.
 * @returns {boolean} True if more heroes survived than were lost, false otherwise.
 */
function checkVictory() {
  // Victory occurs if fewer heroes were lost than were initially in the formation
  return (
    gameState.casualties.length <
    gameState.formation.filter((id) => id !== null).length
  );
}

/**
 * Saves the current game state to localStorage for persistence.
 */
function saveGame() {
  try {
    // Serialize the game state and store it in localStorage
    localStorage.setItem("gameState", JSON.stringify(gameState));
    alert("Game saved successfully!"); // Notify the player
  } catch (error) {
    // Log any errors and alert the player if saving fails
    console.error("Failed to save game:", error);
    alert("Error saving game. Check console for details.");
  }
}

/**
 * Loads a saved game state from localStorage or resets to default if none exists.
 */
function loadGame() {
  try {
    // Retrieve and parse the saved state from localStorage
    const savedState = localStorage.getItem("gameState");
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // Validate the structure of the saved data
      if (!parsedState.heroes || !Array.isArray(parsedState.formation)) {
        throw new Error("Invalid save data structure");
      }
      // Merge the saved state into the current game state
      Object.assign(gameState, parsedState);
      updateUI(); // Refresh the UI with the loaded state
      speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`; // Update battle speed display
      alert("Game loaded successfully!"); // Notify the player
    } else {
      // No saved state found, reset to default
      resetGame();
      alert("No saved game found. Starting fresh.");
    }
  } catch (error) {
    // Log errors and reset to default if loading fails
    console.error("Failed to load game:", error);
    resetGame();
    alert("Error loading game. Resetting to default state.");
  }
}

/**
 * Resets the game state to its initial values and clears saved data.
 */
function resetGame() {
  // Restore initial game state values
  gameState.gold = 250;              // Reset gold
  gameState.day = 1;                 // Initialize day count
  gameState.cycle = "day";           // Set to day cycle
  gameState.heroes = [];             // Clear hero roster
  gameState.formation = Array(9).fill(null); // Reset formation grid
  gameState.selectedHero = null;     // Clear selected hero
  gameState.selectedDungeon = null;  // Clear selected dungeon
  gameState.battleSpeed = 1;         // Reset battle speed
  gameState.casualties = [];         // Clear casualties

  // Generate three initial heroes to start the game
  for (let i = 0; i < 3; i++) addHero(generateHero());
  localStorage.removeItem("gameState"); // Remove any saved game data
  updateUI(); // Refresh the UI to reflect the reset state
}

/**
 * Toggles the game’s day/night cycle and increments the day if transitioning to day.
 */
function toggleCycle() {
  // Switch between day and night cycles
  gameState.cycle = gameState.cycle === "day" ? "night" : "day";
  if (gameState.cycle === "day") {
    // Increment the day counter when transitioning to day
    gameState.day++;
  }
}

// Load the saved game state when the window loads, if supported
if (typeof window !== "undefined") {
  window.addEventListener("load", loadGame); // Initialize game with saved or default state
}