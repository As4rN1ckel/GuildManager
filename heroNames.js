// Simple module for generating fantasy hero names
// Provides a single function to generate random hero names based on predefined first and last names.

// Arrays of first and last names for generating unique hero names
const firstNames = [
    // Male Names 
    "Aric", "Bron", "Cael", "Dorn", "Elric", "Finn", "Gorm", "Harn", "Irwin", "Jace",
    "Kael", "Lorn", "Merek", "Nero", "Oryn", "Pax", "Quin", "Ryn", "Thane", "Veyn",
    
    // Female Names
    "Aelith", "Brynn", "Cindra", "Dalia", "Elara", "Fiora", "Gwyn", "Liora", "Myra", "Sylvi"
  ];
  
  const lastNames = [
    "the Brave", "the Swift", "the Wise", "the Strong", "the Bold", "Darkblade", "Lightbringer", "Stormcaller",
    "Shadowcloak", "Frostwind", "Ironfist", "Moonwhisper", "Sunforge", "Nightshade", "Thunderstrike",
    "Starfall", "Bloodfang", "Skywatcher", "Emberheart", "Stoneguard", "Riversong", "Frostbite",
    "Dawnbringer", "Shadowdancer", "Ironwill", "Mistwalker", "Flamebearer", "Stormrider", "Goldenhawk", "Windspear"
  ];
  
  /**
   * Generates a random fantasy hero name based on the provided class name.
   * @param {string} className - The name of the hero class (e.g., "Warrior"), used for potential future customization.
   * @returns {string} A randomly generated hero name (e.g., "Aric the Brave").
   */
  function generateHeroName(className) {
    // Combine a random first name and last name
    return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${
      lastNames[Math.floor(Math.random() * lastNames.length)]
    }`;
  }
  
  // Export the function for use in other scripts (browser global)
  if (typeof window !== 'undefined') {
    window.generateHeroName = generateHeroName;
  }