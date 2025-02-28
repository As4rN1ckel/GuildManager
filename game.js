// Game state and core logic
const gameState = {
    gold: 250,
    cycle: 'day', 
    heroes: [],
    formation: Array(9).fill(null),
    selectedHero: null,
    selectedDungeon: null,
    battleSpeed: 1,
    casualties: []
};

const heroClasses = [
  {
    type: "warrior",
    name: "Warrior",
    hp: 100,
    attack: 15,
    special: "Shield Bash",
    cost: 100,
    passive: "Takes 20% less damage",
  },
  {
    type: "archer",
    name: "Archer",
    hp: 80,
    attack: 20,
    special: "Multi Shot",
    cost: 120,
    passive: "Deals 20% more damage",
  },
  {
    type: "mage",
    name: "Mage",
    hp: 50,
    attack: 25,
    special: "Fireball",
    cost: 150,
    passive: "Deals 25% more damage",
  },
  {
    type: "cleric",
    name: "Cleric",
    hp: 60,
    attack: 10,
    special: "Heal",
    cost: 140,
    passive: "Heals all allies for 50% attack per battle step",
  },
];

// XP thresholds for leveling up (e.g., 100 XP for Level 2, 200 for Level 3, etc.)
const xpThresholds = [0, 5, 10, 15, 20, 25]; // Levels 1-6 (adjust as needed)

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
      name: "Takes 20% less damage",
      description: "Reduces incoming damage by 20%",
      value: 0.8,
    },
    {
      name: "Deals 20% more damage",
      description: "Increases attack and special damage by 20%",
      value: 1.2,
    },
    {
      name: "Deals 25% more damage",
      description: "Increases attack and special damage by 25%",
      value: 1.25,
    },
    {
      name: "Heals all allies for 50% attack per battle step",
      description: "Heals all injured allies for 50% of attack per turn",
      value: 0.5,
    },
  ];

const dungeons = [
  {
    name: "Forest Ruins",
    difficulty: "Easy",
    reward: 200,
    enemyCount: 3,
    description: "A ruined temple overrun by goblins.",
  },
  {
    name: "Dark Caverns",
    difficulty: "Medium",
    reward: 400,
    enemyCount: 5,
    description: "Ancient caves filled with undead.",
  },
  {
    name: "Dragon's Lair",
    difficulty: "Hard",
    reward: 800,
    enemyCount: 7,
    description: "Home to a terrible dragon.",
  },
];

const enemyStats = {
  easy: { hp: 30, damage: 10 },
  medium: { hp: 50, damage: 15 },
  hard: { hp: 100, damage: 25 },
};

const enemyGroupsTemplate = {
  easy: ["goblins", "kobolds", "wolves", "fairy folk", "brigands"],
  medium: ["skeletons", "ghouls", "shadows", "zombies", "bat swarm"],
  hard: ["dragons", "wyverns", "demons", "hydras", "liches"],
};

const bossNames = {
  easy: [
    "Goblin Warlord",
    "Ancient Treant",
    "Wolf Alpha",
    "Fairy Sovereign",
    "Brigand Leader",
  ],
  medium: [
    "Skeleton King",
    "Ghoul Overlord",
    "Shadow Monarch",
    "Zombie Patriarch",
    "Bat Lord",
  ],
  hard: [
    "Elder Dragon",
    "Infernal Wyrm",
    "Abyssal Demon",
    "Hydra Tyrant",
    "Lich Sovereign",
  ],
};

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
    xp: 0
  };
}

function addHero(hero) {
  gameState.heroes.push(hero);
  renderHeroRoster();
  updateUI();
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
    gameState.cycle = gameState.cycle === 'day' ? 'night' : 'day';
    if (gameState.cycle === 'day') {
        gameState.day++;
    }
}

if (typeof window !== "undefined") {
  window.addEventListener("load", loadGame);
}
