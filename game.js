// Fallback for older browsers or direct script inclusion (global variables)
if (typeof window !== "undefined") {
  window.generateHeroName = window.generateHeroName || function () { console.error("generateHeroName not defined"); };
  window.heroClasses = window.heroClasses || [];
  window.xpThresholds = window.xpThresholds || [0, 10, 25, 60, 120, 250];
  window.heroPassives = window.heroPassives || [];
  window.heroSkills = window.heroSkills || [];
  window.dungeons = window.dungeons || [];
}

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

function addHero(hero) {
  gameState.heroes.push(hero);
  renderHeroRoster();
  updateUI();
}

function generateHero() {
  const classIndex = Math.floor(Math.random() * window.heroClasses.length);
  const heroClass = window.heroClasses[classIndex];
  return {
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    name: window.generateHeroName(heroClass.name),
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
  if (hero.level >= xpThresholds.length - 1) return;
  const nextThreshold = xpThresholds[hero.level];
  if (hero.xp < nextThreshold) return;

  hero.xp -= nextThreshold;
  hero.level++;

  const classStats = {
    "warrior": { maxHp: 14, hpHeal: 8, attack: 2 },
    "archer": { maxHp: 10, hpHeal: 5, attack: 3 },
    "mage": { maxHp: 8, hpHeal: 4, attack: 4 },
    "cleric": { maxHp: 12, hpHeal: 6, attack: 1 }
  };
  const boosts = classStats[hero.class] || { maxHp: 10, hpHeal: 5, attack: 2 };

  hero.maxHp += boosts.maxHp;
  hero.hp = Math.min(hero.maxHp, hero.hp + boosts.hpHeal);
  hero.attack += boosts.attack;

  addLogEntry("xp-level", `${hero.name} leveled up to Level ${hero.level}!`);

  if (hero.xp >= xpThresholds[hero.level]) levelUpHero(hero);
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
  });
}