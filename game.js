const gameState = {
  gold: 200,
  cycle: "day",
  day: 1,
  heroes: [],
  formation: Array(9).fill(null),
  selectedHero: null,
  selectedDungeon: null,
  battleSpeed: 1,
  casualties: [],
};

const HERO_CRIT_CHANCE = 0.1;
const HERO_CRIT_MULTIPLIER = 1.5;
const ENEMY_CRIT_CHANCE = 0.08;
const ENEMY_CRIT_MULTIPLIER = 1.3;
const BOSS_CRIT_CHANCE = 0.12;
const BOSS_CRIT_MULTIPLIER = 1.7;

const heroClasses = [
  {
    type: "warrior",
    name: "Warrior",
    hp: 60,
    attack: 12,
    special: "Shield Bash",
    cost: 80,
    passive: "Ironclad Resilience",
    hitChance: 0.8,
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

const xpThresholds = [0, 10, 25, 60, 120, 250];

const heroPassives = [
  {
    name: "Ironclad Resilience",
    description: "Reduces damage by 20% in front row",
    type: "damageReduction",
    value: 0.8,
    appliesTo: ["warrior"],
    apply: function (hero, target, damage) {
      const position = gameState.formation.indexOf(hero.id);
      return position >= 0 && position <= 2
        ? Math.round(damage * this.value)
        : Math.round(damage);
    },
  },
  {
    name: "Deadly Precision",
    description: "Boosts hit chance by 15% in middle/back row",
    type: "hitChanceBoost",
    value: 0.15,
    appliesTo: ["archer"],
    apply: function (hero) {
      const position = gameState.formation.indexOf(hero.id);
      return position >= 3
        ? Math.min(1.0, hero.hitChance + this.value)
        : hero.hitChance;
    },
  },
  {
    name: "Arcane Potency",
    description: "Boosts damage by 20% in back row",
    type: "damageBoost",
    value: 1.2,
    appliesTo: ["mage"],
    apply: function (hero, damage) {
      const position = gameState.formation.indexOf(hero.id);
      return position >= 6 && position <= 8
        ? Math.round(damage * this.value)
        : Math.round(damage);
    },
  },
  {
    name: "Divine Restoration",
    description:
      "Heals allies for 80% of attack on back row and 40% on other rows.",
    type: "heal",
    value: 0.4,
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      const position = gameState.formation.indexOf(hero.id);
      const multiplier = position >= 6 && position <= 8 ? 0.8 : this.value;
      formationHeroes.forEach((ally) => {
        if (ally.hp < ally.maxHp) {
          const heal = Math.round(hero.attack * multiplier);
          ally.hp = Math.min(ally.maxHp, Math.round(ally.hp + heal));
        }
      });
    },
  },
];

const heroSkills = [
  {
    name: "Shield Bash",
    description: "Deals 30% more damage",
    type: "damage",
    value: 1.3,
    cooldown: 3,
    appliesTo: ["warrior"],
    apply: (hero, target, baseDamage) => Math.round(baseDamage * 1.3),
  },
  {
    name: "Multi Shot",
    description: "Deals 15% more damage to 3 targets",
    type: "damage",
    value: 1.15,
    cooldown: 3,
    appliesTo: ["archer"],
    apply: (hero, targets, baseDamage) => {
      const targetArray = Array.isArray(targets) ? targets : [targets];
      return targetArray.map(() => Math.round(baseDamage * 1.15));
    },
  },
  {
    name: "Fireball",
    description: "Deals 40% more damage",
    type: "damage",
    value: 1.4,
    cooldown: 3,
    appliesTo: ["mage"],
    apply: (hero, target, baseDamage) => Math.round(baseDamage * 1.4),
  },
  {
    name: "Heal",
    description: "Heals a random ally for 150% of attack",
    type: "heal",
    value: 1.5,
    cooldown: 3,
    appliesTo: ["cleric"],
    apply: (hero, formationHeroes) => {
      const injured = formationHeroes.filter((ally) => ally.hp < ally.maxHp);
      if (injured.length > 0) {
        const target = injured[Math.floor(Math.random() * injured.length)];
        const heal = Math.round(hero.attack * 1.5);
        target.hp = Math.min(target.maxHp, Math.round(target.hp + heal));
      }
    },
  },
];

const dungeons = [
  {
    name: "Forest Ruins",
    description: "An abandoned forest ruin",
    difficulty: "Easy",
    reward: 200,
    roomCount: 3,
    enemyCountOnRoom: { min: 3, max: 5 },
    enemies: ["Goblin", "Kobold", "Wolf"],
    enemyStats: { hp: 40, damage: 10, hitChance: 0.8 },
    enemyXp: 1,
    bosses: ["Goblin Warlord", "Ancient Treant"],
    bossStats: { hp: 200, damage: 25, hitChance: 0.8 },
    bossCount: { min: 1, max: 1 },
    bossXP: 3,
  },
  {
    name: "Dark Caverns",
    description: "Caves with eerie undead",
    difficulty: "Medium",
    reward: 400,
    roomCount: 5,
    enemyCountOnRoom: { min: 4, max: 6 },
    enemies: ["Skeleton", "Ghoul", "Shadow"],
    enemyStats: { hp: 60, damage: 18, hitChance: 0.8 },
    enemyXp: 2,
    bosses: ["Skeleton King", "Ghoul Overlord"],
    bossStats: { hp: 300, damage: 45, hitChance: 0.8 },
    bossCount: { min: 1, max: 1 },
    bossXP: 4,
  },
  {
    name: "Dragon's Lair",
    description: "Lair guarded by a dragon",
    difficulty: "Hard",
    reward: 800,
    roomCount: 7,
    enemyCountOnRoom: { min: 5, max: 7 },
    enemies: ["Dragon", "Wyvern", "Demon"],
    enemyStats: { hp: 100, damage: 28, hitChance: 0.8 },
    enemyXp: 3,
    bosses: ["Elder Dragon", "Infernal Wyrm"],
    bossStats: { hp: 500, damage: 70, hitChance: 0.8 },
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

function levelUpHero(hero) {
  if (
    hero.level >= xpThresholds.length - 1 ||
    hero.xp < xpThresholds[hero.level]
  )
    return;
  hero.xp = 0;
  hero.level++;
  hero.maxHp += 10;
  hero.hp = Math.min(hero.maxHp, hero.hp + 10);
  hero.attack += 2;
  addLogEntry("xp-level", `${hero.name} leveled up to Level ${hero.level}!`);
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
    console.error("Save failed:", error);
    alert("Error saving game. Check console.");
  }
}

function loadGame() {
  try {
    const saved = localStorage.getItem("gameState");
    if (saved) {
      const state = JSON.parse(saved);
      if (!state.heroes || !Array.isArray(state.formation))
        throw new Error("Invalid save");
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

function resetGame() {
  gameState.gold = 200;
  gameState.day = 1;
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
  if (gameState.cycle === "day") gameState.day++;
}

// Browser-specific exports
if (typeof window !== "undefined") {
  window.addEventListener("load", loadGame);
  Object.assign(window, {
    gameState,
    heroClasses,
    heroPassives,
    heroSkills,
    xpThresholds,
    dungeons,
  });
}
