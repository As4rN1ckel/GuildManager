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

if (typeof window !== "undefined") {
  window.generateHeroName = generateHeroName;
}