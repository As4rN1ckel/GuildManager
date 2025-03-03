const dungeons = [
  {
    name: "Forest Ruins",
    description: "An abandoned forest ruin",
    difficulty: "Easy",
    reward: 150,
    roomCount: 3,
    statVariance: 0.1,
    eliteChance: 0.05,
    enemyCountOnRoom: { min: 3, max: 5 },
    enemies: ["Goblin", "Kobold", "Wolf"],
    bosses: ["Goblin Warlord", "Ancient Treant"],
    bossCount: { min: 1, max: 1 },
  },
  {
    name: "Dark Caverns",
    description: "Caves with eerie undead",
    difficulty: "Medium",
    reward: 300,
    roomCount: 5,
    statVariance: 0.2,
    eliteChance: 0.1,
    enemyCountOnRoom: { min: 4, max: 6 },
    enemies: ["Skeleton", "Ghoul", "Shadow"],
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossCount: { min: 1, max: 1 },
  },
  {
    name: "Dragon's Lair",
    description: "Lair guarded by a dragon",
    difficulty: "Hard",
    reward: 800,
    roomCount: 7,
    statVariance: 0.3,
    eliteChance: 0.1,
    enemyCountOnRoom: { min: 5, max: 7 },
    enemies: ["Dragon", "Wyvern", "Demon"],
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossCount: { min: 1, max: 2 },
  },
];

// Enemy and Boss Critical Hit Constants
const ENEMY_CRIT_CHANCE = 0.08;    
const ENEMY_CRIT_MULTIPLIER = 1.3; 
const BOSS_CRIT_CHANCE = 0.12;     
const BOSS_CRIT_MULTIPLIER = 1.7; 

// Elite Enemy Modifiers
const ELITE_HP_MULTIPLIER = 2.0;    
const ELITE_DAMAGE_MULTIPLIER = 1.5; 
const ELITE_XP_MULTIPLIER = 2.0;    

const enemies = {
  // Easy Difficulty
  Goblin: {
    name: "Goblin",
    hp: 45,
    damage: 10,
    hitChance: 0.75,
    xp: 1,
    variance: 0.1,
  },
  Kobold: {
    name: "Kobold",
    hp: 35,
    damage: 8,
    hitChance: 0.8,
    xp: 1,
    variance: 0.1,
  },
  Wolf: {
    name: "Wolf",
    hp: 55,
    damage: 12,
    hitChance: 0.7,
    xp: 2,
    variance: 0.1,
  },

  // Medium Difficulty
  Skeleton: {
    name: "Skeleton",
    hp: 70,
    damage: 16,
    hitChance: 0.8,
    xp: 2,
    variance: 0.1,
  },
  Ghoul: {
    name: "Ghoul",
    hp: 80,
    damage: 19,
    hitChance: 0.75,
    xp: 3,
    variance: 0.1,
  },
  Shadow: {
    name: "Shadow",
    hp: 60,
    damage: 21,
    hitChance: 0.85,
    xp: 3,
    variance: 0.1,
  },

  // Hard Difficulty
  Dragon: {
    name: "Dragon",
    hp: 100,
    damage: 28,
    hitChance: 0.8,
    xp: 4,
    variance: 0.1,
  },
  Wyvern: {
    name: "Wyvern",
    hp: 95,
    damage: 26,
    hitChance: 0.75,
    xp: 3,
    variance: 0.1,
  },
  Demon: {
    name: "Demon",
    hp: 110,
    damage: 30,
    hitChance: 0.8,
    xp: 5,
    variance: 0.1,
  },
};

const bosses = {
  // Easy Difficulty
  "Goblin Warlord": {
    name: "Goblin Warlord",
    hp: 200,
    damage: 25,
    hitChance: 0.8,
    xp: 6,
    variance: 0.15,
  },
  "Ancient Treant": {
    name: "Ancient Treant",
    hp: 250,
    damage: 20,
    hitChance: 0.75,
    xp: 6,
    variance: 0.15,
  },

  // Medium Difficulty
  "Skeleton King": {
    name: "Skeleton King",
    hp: 300,
    damage: 45,
    hitChance: 0.85,
    xp: 8,
    variance: 0.15,
  },
  "Ghoul Overlord": {
    name: "Ghoul Overlord",
    hp: 350,
    damage: 40,
    hitChance: 0.8,
    xp: 10,
    variance: 0.15,
  },

  // Hard Difficulty
  "Elder Dragon": {
    name: "Elder Dragon",
    hp: 500,
    damage: 65,
    hitChance: 0.85,
    xp: 15,
    variance: 0.15,
  },
  "Infernal Wyrm": {
    name: "Infernal Wyrm",
    hp: 475,
    damage: 70,
    hitChance: 0.9,
    xp: 12,
    variance: 0.15,
  },
};

if (typeof window !== "undefined") {
  window.dungeons = dungeons;
  window.enemies = enemies;
  window.bosses = bosses;
  window.ENEMY_CRIT_CHANCE = ENEMY_CRIT_CHANCE;    
  window.ENEMY_CRIT_MULTIPLIER = ENEMY_CRIT_MULTIPLIER;
  window.BOSS_CRIT_CHANCE = BOSS_CRIT_CHANCE;         
  window.BOSS_CRIT_MULTIPLIER = BOSS_CRIT_MULTIPLIER; 
  window.ELITE_HP_MULTIPLIER = ELITE_HP_MULTIPLIER;   
  window.ELITE_DAMAGE_MULTIPLIER = ELITE_DAMAGE_MULTIPLIER; 
  window.ELITE_XP_MULTIPLIER = ELITE_XP_MULTIPLIER;   
}