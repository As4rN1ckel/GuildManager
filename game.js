// Core game state and logic
// Manages player resources, heroes, dungeons, and progression mechanics.

// Global game state object, storing key game data
const gameState = {
  gold: 200,              // Initial gold amount for the player
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
    hp: 60,                  // Reduced from 100: Durable but not invincible, fits tank role
    attack: 12,              // Reduced from 20: Moderate damage, focuses on durability
    special: "Shield Bash",  // Unique special ability (deals 25% more damage, 2-turn cooldown)
    cost: 80,                // Reduced from 100: Lower cost for a tank with lower damage
    passive: "Ironclad Resilience", // Passive ability name (reduces damage by 15%)
    hitChance: 0.8,          // Probability of landing an attack (80%), standard for all
  },
  {
    type: "archer",
    name: "Archer",
    hp: 50,           
    attack: 10,           
    special: "Multi Shot", 
    cost: 100,             
    passive: "Deadly Precision", 
    hitChance: 0.8,      
  },
  {
    type: "mage",
    name: "Mage",
    hp: 30,           
    attack: 15,         
    special: "Fireball",   
    cost: 120,         
    passive: "Arcane Potency", 
    hitChance: 0.7,  
  },
  {
    type: "cleric",
    name: "Cleric",
    hp: 40,                
    attack: 5,              
    special: "Heal", 
    cost: 110, 
    passive: "Divine Restoration",
    hitChance: 0.8,
  },
];

// XP thresholds required for heroes to level up
const xpThresholds = [0, 10, 25, 60, 120, 250];

/**
 * Defines passive abilities for each hero class, including their effects and applicability.
 * Adjusted for balance and class fantasy: Warriors gain durability, Archers gain accuracy,
 * Mages boost damage, and Clerics provide sustain. Values align with lower base stats
 * for strategic gameplay. Passives now apply only in specific formation positions (front row for Warriors,
 * middle/back row for Archers, back row for Mages).
 * @type {Array<Object>}
 */
const heroPassives = [
  {
    name: "Ironclad Resilience",     // Passive ability name
    description: "Reduces incoming damage by 20% when in the front row", // UI description
    type: "damageReduction",         // Type of effect
    value: 0.8,                      // Multiplier for 20% damage reduction (1 - 0.8 = 0.2 reduction)
    appliesTo: ["warrior"],          // Classes this passive applies to
    apply: function (hero, target, damage) {
      // Check if the hero is in the front row (formation indices 0–2)
      const heroPosition = gameState.formation.indexOf(hero.id);
      if (heroPosition >= 0 && heroPosition <= 2) { // Front row: indices 0, 1, 2
        // Apply damage reduction and round to the nearest whole number
        return Math.round(damage * this.value); // Ensure integer damage for consistency (20% reduction)
      }
      return Math.round(damage); // No reduction if not in front row
    },
  },
  {
    name: "Deadly Precision",
    description: "Increases hit chance by 15% when in middle or back row", // UI description
    type: "hitChanceBoost",
    value: 0.15,                     // Additive increase to hit chance (15%)
    appliesTo: ["archer"],
    apply: function (hero) {
      // Check if the hero is in the middle or back row (formation indices 3–8)
      const heroPosition = gameState.formation.indexOf(hero.id);
      if (heroPosition >= 3) { // Middle row: 3–5, Back row: 6–8
        // Cap hit chance at 100% and return the boosted value
        return Math.min(1.0, hero.hitChance + this.value);
      }
      return hero.hitChance; // No boost if in front row
    },
  },
  {
    name: "Arcane Potency",
    description: "Increases attack and special damage by 20% when in the back row", // UI description
    type: "damageBoost",
    value: 1.2,                      // Multiplier for 20% damage increase (1.2 = 20% more)
    appliesTo: ["mage"],
    apply: function (hero, damage) {
      // Check if the hero is in the back row (formation indices 6–8)
      const heroPosition = gameState.formation.indexOf(hero.id);
      if (heroPosition >= 6 && heroPosition <= 8) { // Back row: indices 6, 7, 8
        // Apply damage boost and round to the nearest whole number
        return Math.round(damage * this.value);
      }
      return Math.round(damage); // No boost if not in back row
    },
  },
  {
    name: "Divine Restoration",
    description: "Heals all injured allies for 40% of attack per turn when in the front or middle row, and heals by 80% when in the back row.", // Unchanged as requested
    type: "heal",
    value: 0.4, // Base healing multiplier (40% of attack for front/middle, overridden for back)
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      // Determine the Cleric’s position in the formation
      const heroPosition = gameState.formation.indexOf(hero.id);
  
      // Set the healing multiplier based on position
      let healingMultiplier = this.value; // Default to 0.4 (40%) for front/middle
      if (heroPosition >= 6 && heroPosition <= 8) { // Back row: indices 6–8
        healingMultiplier = 0.8; // 80% of attack for back row
      }
  
      // Heal all injured allies by the adjusted percentage of the hero's attack, rounding values
      formationHeroes.forEach((ally) => {
        if (ally.hp < ally.maxHp) {
          const healAmount = Math.round(hero.attack * healingMultiplier);
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
    description: "Deals 30% more damage than base attack",
    type: "damage",
    value: 1.3,           
    cooldown: 3,             
    appliesTo: ["warrior"],
    apply: function (hero, target, baseDamage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Multi Shot",
    description: "Deals 15% more damage than base attack to up to 3 targets with a 3-turn cooldown",
    type: "damage",
    value: 1.15,    
    cooldown: 3,                
    appliesTo: ["archer"],
    apply: function (hero, targets, baseDamage) {
      // Apply damage boost to each target and round to the nearest whole number
      // If targets is a single target (for compatibility), treat it as an array of one
      const targetArray = Array.isArray(targets) ? targets : [targets];
      return targetArray.map(target => Math.round(baseDamage * this.value));
    },
  },
  {
    name: "Fireball",
    description: "Deals 40% more damage than base attack",
    type: "damage",
    value: 1.40,                
    cooldown: 3,
    appliesTo: ["mage"],
    apply: function (hero, target, baseDamage) {
      // Apply damage boost and round to the nearest whole number
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Heal",
    description: "Heals a random injured ally for 150% of attack",
    type: "heal",
    value: 1.5,               
    cooldown: 3,
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
    name: generateHeroName(heroClass.name), // Generate a random fantasy name using heroNames.js
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
    enemyStats: { hp: 40, damage: 10, hitChance: 0.8 }, // Stats for regular enemies
    enemyXp: 1,                    // XP reward per regular enemy
    bosses: ["Goblin Warlord", "Ancient Treant"], // Boss enemy types
    bossStats: { hp: 200, damage: 25, hitChance: 0.8 }, // Stats for bosses
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
    enemyStats: { hp: 60, damage: 18, hitChance: 0.8 },
    enemyXp: 2,
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossStats: { hp: 300, damage: 45, hitChance: 0.8 },
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
    enemyStats: { hp: 100, damage: 28, hitChance: 0.8 },
    enemyXp: 3,
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossStats: { hp: 500, damage: 70, hitChance: 0.8 },
    bossCount: { min: 1, max: 2 },
    bossXP: 5,
  },
];

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
  gameState.gold = 200;              // Reset gold
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