// Game state and core logic
const gameState = {
    gold: 500,
    day: 1,
    heroes: [],
    formation: Array(9).fill(null),
    selectedHero: null,
    selectedDungeon: null,
    battleSpeed: 1,
    casualties: []
};

const heroClasses = [
    { type: 'warrior', name: 'Warrior', hp: 100, attack: 15, special: 'Shield Bash', cost: 100, passive: 'Deals 10% more damage' },
    { type: 'archer', name: 'Archer', hp: 80, attack: 20, special: 'Multi Shot', cost: 120, passive: 'Deals 20% more damage' },
    { type: 'mage', name: 'Mage', hp: 50, attack: 25, special: 'Fireball', cost: 150, passive: 'Deals 25% more damage' },
    { type: 'cleric', name: 'Cleric', hp: 60, attack: 10, special: 'Heal', cost: 140, passive: 'Heals all allies for 10 HP per battle step' }
];

const dungeons = [
    { name: 'Forest Ruins', difficulty: 'Easy', reward: 200, enemyCount: 3, description: 'A ruined temple overrun by goblins.', deathChance: 0.1 },
    { name: 'Dark Caverns', difficulty: 'Medium', reward: 400, enemyCount: 5, description: 'Ancient caves filled with undead.', deathChance: 0.2 },
    { name: 'Dragon\'s Lair', difficulty: 'Hard', reward: 800, enemyCount: 7, description: 'Home to a terrible dragon.', deathChance: 0.4 }
];

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
        cooldown: 0
    };
}

function generateHeroName(className) {
    const firstNames = ['Aric', 'Bron', 'Cael', 'Dorn', 'Elric', 'Finn', 'Gorm', 'Harn', 'Irwin', 'Jace'];
    const lastNames = ['the Brave', 'the Swift', 'the Wise', 'the Strong', 'the Bold', 'Darkblade', 'Lightbringer', 'Stormcaller'];
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

function addHero(hero) {
    gameState.heroes.push(hero);
    renderHeroRoster();
    updateUI();
}

function isHeroInFormation(hero) {
    return gameState.formation.some(slot => slot === hero.id);
}

function checkVictory() {
    return gameState.casualties.length < gameState.formation.filter(id => id !== null).length;
}