// Hero name generation data and function
const firstNames = [
  "Aric", "Bron", "Cael", "Dorn", "Elric", "Finn", "Gorm", "Harn", "Irwin", "Jace",
  "Kael", "Lorn", "Merek", "Nero", "Oryn", "Pax", "Quin", "Ryn", "Thane", "Veyn",
  "Aelith", "Brynn", "Cindra", "Dalia", "Elara", "Fiora", "Gwyn", "Liora", "Myra", "Sylvi",
];

const lastNames = [
  "the Brave", "the Swift", "the Wise", "the Strong", "the Bold", "Darkblade", "Lightbringer", "Stormcaller",
  "Shadowcloak", "Frostwind", "Ironfist", "Moonwhisper", "Sunforge", "Nightshade", "Thunderstrike",
  "Starfall", "Bloodfang", "Skywatcher", "Emberheart", "Stoneguard", "Riversong", "Frostbite",
  "Dawnbringer", "Shadowdancer", "Ironwill", "Mistwalker", "Flamebearer", "Stormrider", "Goldenhawk", "Windspear",
];

/**
 * Generates a random fantasy hero name
 * @param {string} className - Hero class name (unused, reserved for future customization)
 * @returns {string} Random hero name
 */
function generateHeroName(className) {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${first} ${last}`;
}

// Hero class definitions
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

// XP thresholds for leveling up
const xpThresholds = [0, 10, 25, 60, 120, 250, 520, 1050, 2200, 4500, 9100];

// Hero Critical Hit Constants
const HERO_CRIT_CHANCE = 0.1;    
const HERO_CRIT_MULTIPLIER = 1.5; 

// Hero passives
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

// Hero skills
const heroSkills = [
  {
    name: "Shield Bash",
    description: "Deals 30% more damage",
    type: "damage",
    value: 1.3,
    cooldown: 3,
    appliesTo: ["warrior"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Multi Shot",
    description: "Deals 15% more damage to 3 targets",
    type: "damage",
    value: 1.15,
    cooldown: 3,
    appliesTo: ["archer"],
    apply: function (hero, targets, baseDamage) {
      const targetArray = Array.isArray(targets) ? targets : [targets];
      return targetArray.map(() => Math.round(baseDamage * this.value));
    },
  },
  {
    name: "Fireball",
    description: "Deals 40% more damage",
    type: "damage",
    value: 1.4,
    cooldown: 3,
    appliesTo: ["mage"],
    apply: function (hero, target, baseDamage) {
      return Math.round(baseDamage * this.value);
    },
  },
  {
    name: "Heal",
    description: "Heals a random ally for 150% of attack",
    type: "heal",
    value: 1.5,
    cooldown: 3,
    appliesTo: ["cleric"],
    apply: function (hero, formationHeroes) {
      const injured = formationHeroes.filter((ally) => ally.hp < ally.maxHp);
      if (injured.length > 0) {
        const target = injured[Math.floor(Math.random() * injured.length)];
        const heal = Math.round(hero.attack * this.value);
        target.hp = Math.min(target.maxHp, Math.round(target.hp + heal));
      }
    },
  },
];

if (typeof window !== "undefined") {
  window.generateHeroName = generateHeroName;
  window.heroClasses = heroClasses;
  window.xpThresholds = xpThresholds;
  window.heroPassives = heroPassives;
  window.heroSkills = heroSkills;
  window.HERO_CRIT_CHANCE = HERO_CRIT_CHANCE;
  window.HERO_CRIT_MULTIPLIER = HERO_CRIT_MULTIPLIER;
}