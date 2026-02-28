const tierPowerWeights = { D: 1, C: 2, B: 4, A: 7, S: 10 };

const contractTemplates = [
  {
    id: "clear_cellar",
    name: "Clear the Cellar",
    description:
      "A local inn is overrun with giant rats. Quick work for a capable hero.",
    fee: 0,
    reward: { gold: 50, xp: 2 },
    slots: 1,
    duration: { days: 1, cycles: 0 },
    preferredClasses: ["warrior", "mage"],
    difficulty: 1,
  },
  {
    id: "gather_herbs",
    name: "Gather Rare Herbs",
    description:
      "An alchemist needs rare herbs from the forest. Bring them back safely.",
    fee: 0,
    reward: { gold: 60, xp: 2 },
    slots: 1,
    duration: { days: 1, cycles: 1 },
    preferredClasses: ["cleric", "archer"],
    difficulty: 2,
  },
  {
    id: "escort_caravan",
    name: "Escort the Caravan",
    description:
      "Protect merchants traveling through the forest road. Bandits are active.",
    fee: 15,
    reward: { gold: 100, xp: 4 },
    slots: 3,
    duration: { days: 1, cycles: 1 },
    preferredClasses: ["warrior", "archer"],
    difficulty: 3,
  },
  {
    id: "investigate_ruins",
    name: "Investigate the Ruins",
    description: "Nobles want a report on strange activity near an old fort.",
    fee: 15,
    reward: { gold: 120, xp: 5 },
    slots: 2,
    duration: { days: 3, cycles: 0 },
    preferredClasses: ["mage", "archer"],
    difficulty: 4,
  },
  {
    id: "rescue_prisoner",
    name: "Rescue the Prisoner",
    description: "A merchant's son is held by a small bandit camp.",
    fee: 20,
    reward: { gold: 150, xp: 6 },
    slots: 3,
    duration: { days: 2, cycles: 0 },
    preferredClasses: ["warrior", "cleric"],
    difficulty: 5,
  },
  {
    id: "patrol_roads",
    name: "Patrol the Roads",
    description:
      "Keep the trade roads clear of bandits for several days. Strength in numbers.",
    fee: 10,
    reward: { gold: 180, xp: 6 },
    slots: 3,
    duration: { days: 2, cycles: 1 },
    preferredClasses: ["warrior", "archer", "mage"],
    difficulty: 6,
  },
];

function getContractSuccessChance(heroIds, preferredClasses, difficulty) {
  if (!heroIds.length) return 0;
  const heroes = heroIds
    .map((id) => gameState.heroes.find((h) => h.id === id))
    .filter(Boolean);

  const power = heroes.reduce((sum, hero) => {
    const tierPower = tierPowerWeights[hero.tier] || 2;
    const classBonus = preferredClasses.includes(hero.class) ? 1.0 : 0;
    return sum + tierPower + hero.level * 0.8 + classBonus;
  }, 0);

  const threshold = difficulty * 6;
  return Math.min(0.99, Math.max(0.1, power / threshold));
}

function getTotalContractDuration(duration) {
  return duration.days * 2 + duration.cycles;
}

function getCompletionPoint(duration) {
  let totalCycles = getTotalContractDuration(duration);
  let day = gameState.day;
  let cycle = gameState.cycle;
  while (totalCycles > 0) {
    if (cycle === "day") cycle = "night";
    else {
      cycle = "day";
      day++;
    }
    totalCycles--;
  }
  return { day, cycle };
}

function isContractComplete(contract) {
    if (contract.completesOnDay < gameState.day) return true;
    if (contract.completesOnDay === gameState.day) {
        if (contract.completesOnCycle === "day" && gameState.cycle === "day") return true;
        if (contract.completesOnCycle === "night" && gameState.cycle === "night") return true;
    }
    return false;
}

if (typeof window !== "undefined") {
  window.contractTemplates = contractTemplates;
  window.getContractSuccessChance = getContractSuccessChance;
  window.getCompletionPoint = getCompletionPoint;
  window.isContractComplete = isContractComplete;
  window.tierPowerWeights = tierPowerWeights;
}
