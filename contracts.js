const tierPowerWeights = { D: 1, C: 2, B: 3, A: 4, S: 5 };

const contractTemplates = [
    {
        id: "escort_caravan",
        name: "Escort the Caravan",
        description: "Protect merchants traveling through the forest road.",
        fee: 20,
        reward: { gold: 80, xp: 3 },
        slots: 2,
        duration: { days: 1, cycles: 1 },
        preferredClasses: ["warrior", "archer"],
    },
    {
        id: "clear_rats",
        name: "Clear the Cellar",
        description: "A local inn is overrun with giant rats. Nothing glamorous.",
        fee: 0,
        reward: { gold: 50, xp: 2 },
        slots: 1,
        duration: { days: 1, cycles: 0 },
        preferredClasses: ["warrior", "mage"],
    },
    {
        id: "deliver_relic",
        name: "Deliver the Relic",
        description: "Transport a mysterious artifact to a scholar across the region.",
        fee: 30,
        reward: { gold: 120, xp: 4 },
        slots: 2,
        duration: { days: 2, cycles: 0 },
        preferredClasses: ["cleric", "warrior"],
    },
    {
        id: "patrol_roads",
        name: "Patrol the Roads",
        description: "Keep the trade roads safe from bandits for a few days.",
        fee: 10,
        reward: { gold: 90, xp: 3 },
        slots: 3,
        duration: { days: 2, cycles: 1 },
        preferredClasses: ["warrior", "archer"],
    },
    {
        id: "rescue_prisoner",
        name: "Rescue the Prisoner",
        description: "A merchant's son is held by a small bandit camp.",
        fee: 0,
        reward: { gold: 150, xp: 6 },
        slots: 3,
        duration: { days: 2, cycles: 0 },
        preferredClasses: ["warrior", "cleric"],
    },
    {
        id: "gather_herbs",
        name: "Gather Rare Herbs",
        description: "An alchemist needs rare herbs from the forest. Bring them back safely.",
        fee: 0,
        reward: { gold: 60, xp: 2 },
        slots: 1,
        duration: { days: 1, cycles: 1 },
        preferredClasses: ["cleric", "archer"],
    },
    {
        id: "investigate_ruins",
        name: "Investigate the Ruins",
        description: "Nobles want a report on strange activity near an old fort.",
        fee: 15,
        reward: { gold: 100, xp: 5 },
        slots: 2,
        duration: { days: 3, cycles: 0 },
        preferredClasses: ["mage", "archer"],
    },
    {
        id: "guard_festival",
        name: "Guard the Festival",
        description: "The town festival needs security for the night.",
        fee: 0,
        reward: { gold: 70, xp: 2 },
        slots: 2,
        duration: { days: 0, cycles: 1 },
        preferredClasses: ["warrior", "cleric"],
    },
];

function getContractSuccessChance(heroIds, preferredClasses) {
    if (!heroIds.length) return 0;
    const heroes = heroIds.map(id => gameState.heroes.find(h => h.id === id)).filter(Boolean);
    const power = heroes.reduce((sum, hero) => {
        const tierPower = tierPowerWeights[hero.tier] || 2;
        const classBonus = preferredClasses.includes(hero.class) ? 0.5 : 0;
        return sum + tierPower + hero.level * 0.5 + classBonus;
    }, 0);
    const threshold = heroIds.length * 5;
    return Math.min(0.97, Math.max(0.30, power / threshold));
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
        else { cycle = "day"; day++; }
        totalCycles--;
    }
    return { day, cycle };
}

function isContractComplete(contract) {
    if (contract.completesOnDay < gameState.day) return true;
    if (contract.completesOnDay === gameState.day) {
        if (contract.completesOnCycle === "day" && gameState.cycle === "day") return true;
        if (contract.completesOnCycle === "night") return true;
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
