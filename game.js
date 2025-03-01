// Core game state and logic

// Global game state object
const gameState = {
  gold: 200,           // Initial gold
  cycle: "day",        // Day or night cycle
  day: 1,              // Current day
  heroes: [],          // Hero objects in guild
  formation: Array(9).fill(null), // 3x3 formation grid
  selectedHero: null,  // Currently selected hero ID
  selectedDungeon: null, // Selected dungeon for missions
  battleSpeed: 1,      // Battle speed multiplier
  casualties: [],      // IDs of fallen heroes
};

/**
 * Defines base characteristics for hero classes.
 * @type {Array<Object>}
 */
const heroClasses = [
  {
    type: "warrior",    // Class identifier
    name: "Warrior",    // Display name
    hp: 60,             // Base hit points
    attack: 12,         // Base attack damage
    special: "Shield Bash",
    cost: 80,           // Recruitment cost
    passive: "Ironclad Resilience",
    hitChance: 0.8,     // Attack success probability
  },
  {
    type: "archer",     // Class identifier
    name: "Archer",     // Display name
    hp: 50,             // Base hit points
    attack: 10,         // Base attack damage
    special: "Multi Shot",
    cost: 100,          // Recruitment cost
    passive: "Deadly Precision",
    hitChance: 0.8,     // Attack success probability
  },
  {
    type: "mage",       // Class identifier
    name: "Mage",       // Display name
    hp: 30,             // Base hit points
    attack: 15,         // Base attack damage
    special: "Fireball",
    cost: 120,          // Recruitment cost
    passive: "Arcane Potency",
    hitChance: 0.7,     // Attack success probability
  },
  {
    type: "cleric",     // Class identifier
    name: "Cleric",     // Display name
    hp: 40,             // Base hit points
    attack: 5,          // Base attack damage
    special: "Heal",
    cost: 110,          // Recruitment cost
    passive: "Divine Restoration",
    hitChance: 0.8,     // Attack success probability
  },
];

// XP thresholds for leveling
const xpThresholds = [0, 10, 25, 60, 120, 250];

/**
 * Defines passive abilities for hero classes, applying only in specific positions.
 * @type {Array<Object>}
 */
const heroPassives = [
  {
    name: "Ironclad Resilience",  // Passive name
    description: "Reduces damage by 20% in front row", // UI description
    type: "damageReduction",
    value: 0.8,                  // 20% damage reduction
    appliesTo: ["warrior"],
    apply: function (hero, target, damage) {
      const position = gameState.formation.indexOf(hero.id);
      if (position >= 0 && position <= 2) { // Front row
        return Math.round(damage * this.value); // 20% reduction
      }
      return Math.round(damage); // No reduction
    },
  },
  {
    name: "Deadly Precision",     // Passive name
    description: "Boosts hit chance by 15% in middle/back row", // UI description
    type: "hitChanceBoost",
    value: 0.15,                 // 15% hit chance increase
    appliesTo: ["archer"],
    apply: function (hero) {
      const position = gameState.formation.indexOf(hero.id);
      if (position >= 3) { // Middle or back row
        return Math.min(1.0, hero.hitChance + this.value);
      }
      return hero.hitChance; // No boost
    },
  },
  {
    name: "Arcane Potency",       // Passive name
    description: "Boosts damage by 20% in back row", // UI description
    type: "damageBoost",
    value: 1.2,                  // 20% damage increase
    appliesTo: ["mage"],
    apply: function (hero, damage) {
      const position = gameState.formation.indexOf(hero.id);
      if (position >= 6 && position <= 8) { // Back row
        return Math.round(damage * this.value);
      }
      return Math.round(damage); // No boost
    },
  },
  {
    name: "Divine Restoration",   // Passive name
    description: "Heals allies for 40–80% of attack by position", // UI description
    type: "heal",
    value: 0.4,                  // Base 40% healing (front/middle), overridden for back
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      let multiplier = this.value; // 40% for front/middle
      const position = gameState.formation.indexOf(hero.id);
      if (position >= 6 && position <= 8) { // Back row
        multiplier = 0.8; // 80% for back
      }
      formationHeroes.forEach(ally => {
        if (ally.hp < ally.maxHp) {
          const heal = Math.round(hero.attack * multiplier);
          ally.hp = Math.min(ally.maxHp, Math.round(ally.hp + heal)); // Cap at max HP
        }
      });
    },
  },
];

/**
 * Defines special abilities for hero classes.
 * @type {Array<Object>}
 */
const heroSkills = [
  {
    name: "Shield Bash",          // Skill name
    description: "Deals 30% more damage", // UI description
    type: "damage",
    value: 1.3,                   // 30% damage increase
    cooldown: 3,                  // Turns until reuse
    appliesTo: ["warrior"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Multi Shot",           // Skill name
    description: "Deals 15% more damage to 3 targets", // UI description
    type: "damage",
    value: 1.15,                  // 15% damage increase per target
    cooldown: 3,                  // Turns until reuse
    appliesTo: ["archer"],
    apply: function (hero, targets, baseDamage) {
      const targetArray = Array.isArray(targets) ? targets : [targets];
      return targetArray.map(target => Math.round(baseDamage * this.value));
    },
  },
  {
    name: "Fireball",             // Skill name
    description: "Deals 40% more damage", // UI description
    type: "damage",
    value: 1.4,                   // 40% damage increase
    cooldown: 3,                  // Turns until reuse
    appliesTo: ["mage"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Heal",                 // Skill name
    description: "Heals a random ally for 150% of attack", // UI description
    type: "heal",
    value: 1.5,                   // 150% healing increase
    cooldown: 3,                  // Turns until reuse
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      const injured = formationHeroes.filter(ally => ally.hp < ally.maxHp);
      if (injured.length > 0) {
        const target = injured[Math.floor(Math.random() * injured.length)];
        const heal = Math.round(hero.attack * this.value);
        target.hp = Math.min(target.maxHp, Math.round(target.hp + heal)); // Cap at max HP
      }
    },
  },
];

/**
 * Defines available dungeons with difficulties, enemies, and rewards.
 * @type {Array<Object>}
 */
const dungeons = [
  {
    name: "Forest Ruins",         // Dungeon name
    description: "An abandoned forest ruin", // Brief description
    difficulty: "Easy",           // Difficulty level
    reward: 200,                  // Gold reward
    roomCount: 3,                 // Number of rooms
    enemyCountOnRoom: { min: 3, max: 5 }, // Enemy range per room
    enemies: ["goblin", "kobold", "wolf"],
    enemyStats: { hp: 40, damage: 10, hitChance: 0.8 },
    enemyXp: 1,                    // XP per enemy
    bosses: ["Goblin Warlord", "Ancient Treant"],
    bossStats: { hp: 200, damage: 25, hitChance: 0.8 },
    bossCount: { min: 1, max: 1 }, // Boss range per room
    bossXP: 3,                     // XP per boss
  },
  {
    name: "Dark Caverns",         // Dungeon name
    description: "Caves with eerie undead", // Brief description
    difficulty: "Medium",         // Difficulty level
    reward: 400,                  // Gold reward
    roomCount: 5,                 // Number of rooms
    enemyCountOnRoom: { min: 4, max: 6 }, // Enemy range per room
    enemies: ["skeleton", "ghoul", "shadow"],
    enemyStats: { hp: 60, damage: 18, hitChance: 0.8 },
    enemyXp: 2,                    // XP per enemy
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossStats: { hp: 300, damage: 45, hitChance: 0.8 },
    bossCount: { min: 1, max: 1 }, // Boss range per room
    bossXP: 4,                     // XP per boss
  },
  {
    name: "Dragon's Lair",        // Dungeon name
    description: "Lair guarded by a dragon", // Brief description
    difficulty: "Hard",           // Difficulty level
    reward: 800,                  // Gold reward
    roomCount: 7,                 // Number of rooms
    enemyCountOnRoom: { min: 5, max: 7 }, // Enemy range per room
    enemies: ["dragon", "wyvern", "demon"],
    enemyStats: { hp: 100, damage: 28, hitChance: 0.8 },
    enemyXp: 3,                    // XP per enemy
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossStats: { hp: 500, damage: 70, hitChance: 0.8 },
    bossCount: { min: 1, max: 2 }, // Boss range per room
    bossXP: 5,                     // XP per boss
  },
];

/**
 * Adds a hero to the game state and updates the UI.
 * @param {Object} hero - The hero to add.
 */
function addHero(hero) {
  gameState.heroes.push(hero); // Add hero to roster
  renderHeroRoster();          // Update hero roster display
  updateUI();                  // Refresh UI
}

/**
 * Generates a new hero with random stats and name.
 * @returns {Object} A new hero object.
 */
function generateHero() {
  const classIndex = Math.floor(Math.random() * heroClasses.length);
  const heroClass = heroClasses[classIndex];
  return {
    id: Date.now() + Math.random().toString(36).substring(2, 9), // Unique ID
    name: generateHeroName(heroClass.name), // Random fantasy name
    class: heroClass.type,                   // Hero class
    hp: heroClass.hp,                       // Base hit points
    maxHp: heroClass.hp,                    // Max hit points
    attack: heroClass.attack,               // Base attack
    special: heroClass.special,             // Special ability
    level: 1,                               // Starting level
    cost: heroClass.cost,                   // Recruitment cost
    passive: heroClass.passive,             // Passive ability
    cooldown: 0,                            // Initial cooldown
    xp: 0,                                  // Starting XP
    hitChance: heroClass.hitChance,         // Base hit chance
  };
}

/**
 * Levels up a hero if they have enough XP.
 * @param {Object} hero - The hero to level up.
 */
function levelUpHero(hero) {
  const level = hero.level;
  if (level >= xpThresholds.length - 1) return; // Max level check
  if (hero.xp >= xpThresholds[level]) {
    hero.xp = 0;           // Reset XP
    hero.level++;          // Increase level
    hero.maxHp += 10;      // Boost max HP
    hero.hp = Math.min(hero.maxHp, hero.hp + 10); // Heal and cap HP
    hero.attack += 2;      // Boost attack
    addLogEntry("xp-level", `${hero.name} leveled up to Level ${hero.level}!`);
  }
}

/**
 * Checks if a hero is in the formation.
 * @param {Object} hero - The hero to check.
 * @returns {boolean} True if in formation.
 */
function isHeroInFormation(hero) {
  return gameState.formation.some(slot => slot === hero.id);
}

/**
 * Determines if the player won a dungeon mission.
 * @returns {boolean} True if victory.
 */
function checkVictory() {
  return gameState.casualties.length < gameState.formation.filter(id => id !== null).length;
}

/**
 * Saves the game state to localStorage.
 */
function saveGame() {
  try {
    localStorage.setItem("gameState", JSON.stringify(gameState));
    alert("Game saved successfully!");
  } catch (error) {
    console.error("Save failed:", error);
    alert("Error saving game. Check console.");
  }
}

/**
 * Loads a saved game state or resets if none exists.
 */
function loadGame() {
  try {
    const saved = localStorage.getItem("gameState");
    if (saved) {
      const state = JSON.parse(saved);
      if (!state.heroes || !Array.isArray(state.formation)) throw new Error("Invalid save");
      Object.assign(gameState, state);
      updateUI();
      speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
      alert("Game loaded successfully!");
    } else {
      resetGame();
      alert("No save found. Starting fresh.");
    }
  } catch (error) {
    console.error("Load failed:", error);
    resetGame();
    alert("Error loading game. Resetting to default.");
  }
}

/**
 * Resets the game to initial state and clears saves.
 */
function resetGame() {
  gameState.gold = 200;        // Reset gold
  gameState.day = 1;           // Reset day
  gameState.cycle = "day";     // Reset cycle
  gameState.heroes = [];       // Clear heroes
  gameState.formation = Array(9).fill(null); // Clear formation
  gameState.selectedHero = null; // Clear selection
  gameState.selectedDungeon = null; // Clear dungeon
  gameState.battleSpeed = 1;   // Reset speed
  gameState.casualties = [];   // Clear casualties
  for (let i = 0; i < 3; i++) addHero(generateHero()); // Add initial heroes
  localStorage.removeItem("gameState"); // Clear saves
  updateUI();                  // Refresh UI
}

/**
 * Toggles the day/night cycle, incrementing the day if transitioning to day.
 */
function toggleCycle() {
  gameState.cycle = gameState.cycle === "day" ? "night" : "day";
  if (gameState.cycle === "day") gameState.day++; // Increment day
}

// Expose globals for ui.js and battle.js
if (typeof window !== "undefined") {
  window.gameState = gameState;
  window.heroClasses = heroClasses;
  window.heroPassives = heroPassives;
  window.heroSkills = heroSkills;
  window.xpThresholds = xpThresholds;
  window.dungeons = dungeons;
}