// Game state and core logic
const gameState = {
  gold: 250,
  cycle: "day",
  heroes: [],
  formation: Array(9).fill(null),
  selectedHero: null,
  selectedDungeon: null,
  battleSpeed: 1,
  casualties: [],
};

const heroClasses = [
  {
    type: "warrior",
    name: "Warrior",
    hp: 100,
    attack: 15,
    special: "Shield Bash",
    cost: 100,
    passive: "Ironclad Resilience", // Renamed from "Takes 20% less damage"
  },
  {
    type: "archer",
    name: "Archer",
    hp: 80,
    attack: 20,
    special: "Multi Shot",
    cost: 120,
    passive: "Deadly Precision", // Renamed from "Deals 20% more damage"
  },
  {
    type: "mage",
    name: "Mage",
    hp: 50,
    attack: 25,
    special: "Fireball",
    cost: 150,
    passive: "Arcane Potency", // Renamed from "Deals 25% more damage"
  },
  {
    type: "cleric",
    name: "Cleric",
    hp: 60,
    attack: 10,
    special: "Heal",
    cost: 140,
    passive: "Divine Restoration", // Renamed from "Heals all allies for 50% attack per battle step"
  },
];

function generateHeroName(className) {
  const firstNames = [
    "Aric",
    "Bron",
    "Cael",
    "Dorn",
    "Elric",
    "Finn",
    "Gorm",
    "Harn",
    "Irwin",
    "Jace",
  ];
  const lastNames = [
    "the Brave",
    "the Swift",
    "the Wise",
    "the Strong",
    "the Bold",
    "Darkblade",
    "Lightbringer",
    "Stormcaller",
  ];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
    lastNames[Math.floor(Math.random() * lastNames.length)]
  }`;
}

const specialAbilities = [
  {
    name: "Shield Bash",
    description: "Deals 25% more damage than base attack",
    value: 1.25,
  },
  {
    name: "Multi Shot",
    description: "Deals 40% more damage than base attack",
    value: 1.4,
  },
  {
    name: "Fireball",
    description: "Deals 50% more damage than base attack",
    value: 1.5,
  },
  {
    name: "Heal",
    description: "Heals a random injured ally for 100% of attack",
    value: 1.0,
  },
];

const passiveAbilities = [
  {
    name: "Ironclad Resilience",
    description: "Reduces incoming damage by 20%",
    value: 0.8,
  },
  {
    name: "Deadly Precision",
    description: "Increases attack and special damage by 20%",
    value: 1.2,
  },
  {
    name: "Arcane Potency",
    description: "Increases attack and special damage by 25%",
    value: 1.25,
  },
  {
    name: "Divine Restoration",
    description: "Heals all injured allies for 50% of attack per turn",
    value: 0.5,
  },
];

// XP thresholds for leveling up
const xpThresholds = [0, 5, 12, 25, 55, 120];

function levelUpHero(hero) {
  const currentLevel = hero.level;
  const maxLevel = xpThresholds.length - 1;
  if (currentLevel >= maxLevel) return; // Prevent leveling beyond max level

  if (hero.xp >= xpThresholds[currentLevel]) {
    hero.xp = 0;
    hero.level++;
    hero.maxHp += 10;
    hero.hp = Math.min(hero.maxHp, hero.hp + 10);
    hero.attack += 2;
    addLogEntry('xp-level', `${hero.name} leveled up to Level ${hero.level}!`);
  }
}

const dungeons = [
  {
    name: "Forest Ruins",
    description: "An abandoned ruin in the heart of the forest.",
    difficulty: "Easy",
    reward: 200,
    roomCount: 3,
    enemyCountOnRoom: { min: 3, max: 5 }, // Range of enemies per room (3-5)
    enemies: ["goblin", "kobold", "wolf"],
    enemyStats: { hp: 40, damage: 12 }, // Stats for regular enemies
    enemyXp: 1, // XP reward per regular enemy
    bosses: ["Goblin Warlord", "Ancient Treant"],
    bossStats: { hp: 120, damage: 24 }, // Stats for bosses
    bossCount: { min: 1, max: 1 }, // Range of bosses per boss room (1 boss)
    bossXP: 3, // XP reward per boss
  },
  {
    name: "Dark Caverns",
    description: "Ancient caves filled with eerie undead.",
    difficulty: "Medium",
    reward: 400,
    roomCount: 5,
    enemyCountOnRoom: { min: 4, max: 6 }, // Range of enemies per room (4-6)
    enemies: ["skeleton", "ghoul", "shadow"],
    enemyStats: { hp: 60, damage: 20 }, // Stats for regular enemies
    enemyXp: 2, // XP reward per regular enemy
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossStats: { hp: 180, damage: 40 }, // Stats for bosses
    bossCount: { min: 1, max: 1 }, // Range of bosses per boss room (1 boss)
    bossXP: 4, // XP reward per boss
  },
  {
    name: "Dragon's Lair",
    description: "A perilous lair guarded by a fearsome dragon.",
    difficulty: "Hard",
    reward: 800,
    roomCount: 7,
    enemyCountOnRoom: { min: 5, max: 7 }, // Range of enemies per room (5-7)
    enemies: ["dragon", "wyvern", "demon"],
    enemyStats: { hp: 100, damage: 30 }, // Stats for regular enemies
    enemyXp: 3, // XP reward per regular enemy
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossStats: { hp: 300, damage: 60 }, // Stats for bosses
    bossCount: { min: 1, max: 2 }, // Range of bosses per boss room (1-2 bosses)
    bossXP: 5, // XP reward per boss
  },
];

function addHero(hero) {
  gameState.heroes.push(hero);
  renderHeroRoster();
  updateUI();
}

function generateHero() {
  const classIndex = Math.floor(Math.random() * heroClasses.length);
  const heroClass = heroClasses[classIndex];
  return {
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    name: generateHeroName(heroClass.name),
    class: heroClass.type,
    hp: heroClass.hp,
    maxHp: heroClass.hp,
    attack: heroClass.attack,
    special: heroClass.special,
    level: 1,
    cost: heroClass.cost,
    passive: heroClass.passive,
    cooldown: 0,
    xp: 0,
  };
}

function isHeroInFormation(hero) {
  return gameState.formation.some((slot) => slot === hero.id);
}

function checkVictory() {
  return (
    gameState.casualties.length <
    gameState.formation.filter((id) => id !== null).length
  );
}

function saveGame() {
  try {
    localStorage.setItem("gameState", JSON.stringify(gameState));
    alert("Game saved successfully!");
  } catch (error) {
    console.error("Failed to save game:", error);
    alert("Error saving game. Check console for details.");
  }
}

function loadGame() {
  try {
    const savedState = localStorage.getItem("gameState");
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      if (!parsedState.heroes || !Array.isArray(parsedState.formation)) {
        throw new Error("Invalid save data structure");
      }
      Object.assign(gameState, parsedState);
      updateUI();
      speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
      alert("Game loaded successfully!");
    } else {
      resetGame();
      alert("No saved game found. Starting fresh.");
    }
  } catch (error) {
    console.error("Failed to load game:", error);
    resetGame();
    alert("Error loading game. Resetting to default state.");
  }
}

function resetGame() {
  gameState.gold = 250;
  gameState.day = 1; // Ensure day is initialized
  gameState.cycle = "day";
  gameState.heroes = [];
  gameState.formation = Array(9).fill(null);
  gameState.selectedHero = null;
  gameState.selectedDungeon = null;
  gameState.battleSpeed = 1;
  gameState.casualties = [];
  for (let i = 0; i < 3; i++) addHero(generateHero());
  localStorage.removeItem("gameState");
  updateUI();
}

function toggleCycle() {
  gameState.cycle = gameState.cycle === "day" ? "night" : "day";
  if (gameState.cycle === "day") {
    gameState.day++;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", loadGame);
}
