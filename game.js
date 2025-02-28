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
    attack: 20,
    special: "Shield Bash",
    cost: 100,
    passive: "Ironclad Resilience",
    hitChance: 0.8,
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

const heroPassives = [
  {
    name: "Ironclad Resilience",
    description: "Reduces incoming damage by 15%",
    type: "damageReduction",
    value: 0.85, // Multiplier for damage reduction
    appliesTo: ["warrior"],
    apply: function (hero, target, damage) {
      return Math.round(damage * this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Deadly Precision",
    description: "Increases hit chance by 10%",
    type: "hitChanceBoost",
    value: 0.1, // Additive increase to hit chance
    appliesTo: ["archer"],
    apply: function (hero) {
      return Math.min(1.0, hero.hitChance + this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Arcane Potency",
    description: "Increases attack and special damage by 15%",
    type: "damageBoost",
    value: 1.15, // Multiplier for damage
    appliesTo: ["mage"],
    apply: function (hero, damage) {
      return Math.round(damage * this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Divine Restoration",
    description: "Heals all injured allies for 50% of attack per turn",
    type: "heal",
    value: 0.5, // Fraction of attack for healing
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      formationHeroes.forEach((ally) => {
        if (ally.hp < ally.maxHp) {
          const healAmount = Math.round(hero.attack * this.value);
          ally.hp = Math.min(ally.maxHp, Math.round(ally.hp + healAmount));
        }
      });
    },
  },
];

const heroSkills = [
  {
    name: "Shield Bash",
    description: "Deals 25% more damage than base attack",
    type: "damage",
    value: 1.25, // Damage multiplier
    cooldown: 2,
    appliesTo: ["warrior"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Multi Shot",
    description: "Deals 40% more damage than base attack",
    type: "damage",
    value: 1.4, // Damage multiplier
    cooldown: 2,
    appliesTo: ["archer"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Fireball",
    description: "Deals 50% more damage than base attack",
    type: "damage",
    value: 1.5, // Damage multiplier
    cooldown: 2,
    appliesTo: ["mage"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value); // Use function() for proper this binding
    },
  },
  {
    name: "Heal",
    description: "Heals a random injured ally for 100% of attack",
    type: "heal",
    value: 1.0, // Healing multiplier
    cooldown: 2,
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      const injuredAllies = formationHeroes.filter(
        (ally) => ally.hp < ally.maxHp
      );
      if (injuredAllies.length > 0) {
        const healTarget =
          injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
        const healAmount = Math.round(hero.attack * this.value);
        healTarget.hp = Math.min(healTarget.maxHp, Math.round(healTarget.hp + healAmount));
      }
    },
  },
];

// XP thresholds for leveling up
const xpThresholds = [0, 10, 25, 60, 120, 250];

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
    addLogEntry("xp-level", `${hero.name} leveled up to Level ${hero.level}!`);
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
    enemyStats: { hp: 40, damage: 12, hitChance: 0.8 }, // Stats for regular enemies
    enemyXp: 1, // XP reward per regular enemy
    bosses: ["Goblin Warlord", "Ancient Treant"],
    bossStats: { hp: 120, damage: 24, hitChance: 0.8 }, // Stats for bosses
    bossCount: { min: 1, max: 1 }, // Range of bosses per boss room (1 boss)
    bossXP: 3, // XP reward per boss
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
    bossStats: { hp: 180, damage: 40, hitChance: 0.8 },
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
    bossStats: { hp: 300, damage: 60, hitChance: 0.8 },
    bossCount: { min: 1, max: 2 },
    bossXP: 5,
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
    hitChance: heroClass.hitChance,
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
