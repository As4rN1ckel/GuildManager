if (typeof window !== "undefined") {
  window.generateHeroName =
    window.generateHeroName ||
    function () {
      console.error("generateHeroName not defined");
    };
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
  casualties: [],
  retreated: false,
  shopHeroes: [],
  activeContracts: [],
};

function addHero(hero) {
  gameState.heroes.push(hero);
  renderHeroRoster();
  updateUI();
}

function generateHero() {
  const classIndex = Math.floor(Math.random() * heroClasses.length);
  const heroClass = heroClasses[classIndex];
  const tier = getRandomTier();
  const statMultiplier = heroTiers[tier].statMultiplier;
  const costMultiplier = heroTiers[tier].costMultiplier;

  const hero = {
    id: Date.now() + Math.random().toString(36).substring(2, 9),
    name: generateHeroName(heroClass.name),
    class: heroClass.type,
    tier: tier,
    hp: Math.round(heroClass.hp * statMultiplier),
    maxHp: Math.round(heroClass.hp * statMultiplier),
    attack: Math.round(heroClass.attack * statMultiplier),
    special: heroClass.special,
    level: 1,
    cost: Math.round(heroClass.cost * costMultiplier),
    passive: heroClass.passive,
    xp: 0,
    hitChance: Math.min(1.0, heroClass.hitChance),
    speed: Math.round(heroClass.speed),
    charges: 0,
  };

  return hero;
}

function levelUpHero(hero) {
  if (hero.level >= xpThresholds.length - 1) return;
  const nextThreshold = xpThresholds[hero.level];
  if (hero.xp < nextThreshold) return;

  hero.xp -= nextThreshold;
  hero.level++;

  const classStats = {
    warrior: { maxHp: 14, hpHeal: 8, attack: 2 },
    archer: { maxHp: 10, hpHeal: 5, attack: 3 },
    mage: { maxHp: 8, hpHeal: 4, attack: 4 },
    cleric: { maxHp: 12, hpHeal: 6, attack: 1 },
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

function dismissHero(heroId) {
  const hero = gameState.heroes.find((h) => h.id === heroId);
  if (!hero) return;

  const refund = Math.floor(hero.cost * 0.3) + (hero.level - 1) * 10;
  gameState.gold += refund;
  gameState.heroes = gameState.heroes.filter((h) => h.id !== heroId);
  gameState.formation = gameState.formation.map((id) =>
    id === heroId ? null : id,
  );
  gameState.selectedHero = null;
  updateUI();
}

function checkVictory() {
  return (
    gameState.casualties.length <
    gameState.formation.filter((id) => id !== null).length
  );
}

function assignContract(templateId, heroIds) {
  const template = contractTemplates.find((c) => c.id === templateId);
  if (!template) return;

  if (gameState.gold < template.fee) {
    alert(`Not enough gold! Need ${template.fee}g.`);
    return;
  }

  const alreadyBusy = heroIds.some((id) => isHeroOnContract(id));
  if (alreadyBusy) {
    alert("One or more heroes are already on a contract.");
    return;
  }

  gameState.gold -= template.fee;
  const completion = getCompletionPoint(template.duration);
  gameState.activeContracts.push({
    contractId: templateId,
    assignedHeroes: heroIds,
    completesOnDay: completion.day,
    completesOnCycle: completion.cycle,
    status: "active",
  });
  updateUI();
}

function resolveContracts() {
  gameState.activeContracts.forEach((contract) => {
    if (contract.status === "active" && isContractComplete(contract)) {
      const template = contractTemplates.find(
        (t) => t.id === contract.contractId,
      );
      if (!template) return;
      const chance = getContractSuccessChance(
        contract.assignedHeroes,
        template.preferredClasses,
        template.difficulty,
      );
      const success = Math.random() < chance;
      contract.status = success ? "completed" : "failed";

      if (success) {
        showToast(
          `✔ "${template.name}" succeeded! Claim your reward.`,
          "success",
        );
      } else {
        showToast(
          `✘ "${template.name}" failed. Heroes returned empty-handed.`,
          "failed",
        );
      }
    }
  });
}

function claimContract(contractId) {
  const contract = gameState.activeContracts.find(
    (c) => c.contractId === contractId && c.status === "completed",
  );
  if (!contract) return;

  const template = contractTemplates.find((t) => t.id === contractId);
  if (!template) return;

  gameState.gold += template.reward.gold;
  contract.assignedHeroes.forEach((id) => {
    const hero = gameState.heroes.find((h) => h.id === id);
    if (hero) {
      hero.xp = Math.round(hero.xp + template.reward.xp);
      levelUpHero(hero);
    }
  });

  gameState.activeContracts = gameState.activeContracts.filter(
    (c) => !(c.contractId === contractId && c.status === "completed"),
  );
  updateUI();
}

function dismissContract(contractId) {
  gameState.activeContracts = gameState.activeContracts.filter(
    (c) => !(c.contractId === contractId && c.status === "failed"),
  );
  updateUI();
}

function isHeroOnContract(heroId) {
  return gameState.activeContracts.some(
    (c) => c.status === "active" && c.assignedHeroes.includes(heroId),
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
  gameState.casualties = [];
  gameState.retreated = false;
  gameState.shopHeroes = [];
  for (let i = 0; i < 3; i++) addHero(generateHero());
  localStorage.removeItem("gameState");
  updateUI();
}

function toggleCycle() {
  gameState.cycle = gameState.cycle === "day" ? "night" : "day";
  if (gameState.cycle === "day") {
    gameState.day++;
    gameState.shopHeroes = [];
  }
}

// Browser-specific exports
if (typeof window !== "undefined") {
  window.addEventListener("load", loadGame);
  Object.assign(window, gameState);
  window.assignContract = assignContract;
  window.resolveContracts = resolveContracts;
  window.isHeroOnContract = isHeroOnContract;
  window.claimContract = claimContract;
  window.dismissContract = dismissContract;
}
