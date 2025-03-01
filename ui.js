// User Interface management
// Handles DOM interactions, event listeners, and UI updates for game screens and components.

// DOM elements for key UI components
const heroRoster = document.getElementById("hero-roster"); // Container for displaying available heroes
const formationGrid = document.getElementById("formation-grid"); // 3x3 grid for hero formation
const dungeonList = document.getElementById("dungeon-list"); // List of available dungeons
const recruitBtn = document.getElementById("recruit-btn"); // Button to open the hero recruitment shop
const embarkBtn = document.getElementById("embark-btn"); // Button to start a dungeon mission
const continueBtn = document.getElementById("continue-btn"); // Button to return to the guild after results
const backToGuildBtn = document.getElementById("back-to-guild-btn"); // Button to return from shop to guild
const goldAmount = document.getElementById("gold-amount"); // Display for current gold amount
const dayCount = document.getElementById("day-count"); // Display for current day/night cycle
const mainScreen = document.getElementById("main-screen"); // Main game screen
const battleScreen = document.getElementById("battle-screen"); // Battle screen during missions
const resultsScreen = document.getElementById("results-screen"); // Results screen after missions
const shopScreen = document.getElementById("shop-screen"); // Shop screen for recruiting heroes
const heroStatsPanel = document.getElementById("hero-stats-panel"); // Panel for detailed hero stats
const heroStatsContent = document.getElementById("hero-stats-content"); // Content area for hero stats
const modalOverlay = document.getElementById("modal-overlay"); // Overlay for modal effect
const closeHeroStatsBtn = document.getElementById("close-hero-stats"); // Close button for hero stats panel

// Dynamically created buttons for game management
const saveBtn = document.createElement("button");
saveBtn.textContent = "SAVE";
saveBtn.className = "primary"; // Apply primary button styling

const loadBtn = document.createElement("button");
loadBtn.textContent = "LOAD";
loadBtn.className = "primary"; // Apply primary button styling

const resetBtn = document.createElement("button");
resetBtn.textContent = "RESET";
resetBtn.className = "primary"; // Apply primary button styling

const restBtn = document.getElementById("rest-btn"); // Button to rest and heal heroes
const restCostAmount = document.getElementById("rest-cost-amount"); // Display for rest action cost

/**
 * Initializes the game UI, setting up event listeners and rendering initial content.
 */
function initGame() {
  // Verify DOM elements exist before proceeding
  if (
    !heroRoster ||
    !formationGrid ||
    !dungeonList ||
    !recruitBtn ||
    !embarkBtn ||
    !continueBtn ||
    !backToGuildBtn ||
    !goldAmount ||
    !dayCount ||
    !mainScreen ||
    !battleScreen ||
    !resultsScreen ||
    !shopScreen ||
    !heroStatsPanel ||
    !heroStatsContent ||
    !modalOverlay ||
    !closeHeroStatsBtn ||
    !speedBtn ||
    !restBtn ||
    !restCostAmount
  ) {
    console.error("One or more UI elements are missing from the DOM.");
    return;
  }

  // Set initial battle speed display
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;

  // Create and configure formation grid slots
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "formation-slot"; // Apply formation slot styling
    slot.dataset.index = i; // Store slot index for drag-and-drop
    slot.addEventListener("dragover", (e) => e.preventDefault()); // Allow drop by preventing default
    slot.addEventListener("drop", (e) => handleDrop(e, i)); // Handle dropping heroes into slots
    formationGrid.appendChild(slot);
  }

  // Enable heroRoster as a drop zone for returning heroes
  heroRoster.addEventListener("dragover", (e) => e.preventDefault()); // Allow drop
  heroRoster.addEventListener("drop", (e) => handleDrop(e, null)); // Handle dropping back to roster

  // Populate dungeon list with clickable dungeon entries
  dungeons.forEach((dungeon) => {
    const dungeonEl = document.createElement("div");
    dungeonEl.className = "dungeon"; // Apply dungeon styling
    dungeonEl.innerHTML = `
      <div><strong>${dungeon.name}</strong> (${dungeon.difficulty})<div>${dungeon.description}</div></div>
      <div>Reward: ${dungeon.reward} Gold</div>
    `;
    dungeonEl.addEventListener("click", () => selectDungeon(dungeon)); // Select dungeon on click
    dungeonList.appendChild(dungeonEl);
  });

  // Attach event listeners to action buttons
  recruitBtn.addEventListener("click", showShopScreen); // Open hero recruitment shop
  embarkBtn.addEventListener("click", startMission); // Start a dungeon mission
  speedBtn.addEventListener("click", toggleBattleSpeed); // Toggle battle speed
  continueBtn.addEventListener("click", returnToGuild); // Return to guild after results
  backToGuildBtn.addEventListener("click", hideShopScreen); // Return from shop to guild

  // Create and add header buttons for game management
  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex"; // Use flexbox for layout
  headerButtons.style.gap = "10px"; // Space between buttons
  headerButtons.appendChild(saveBtn); // Add save button
  headerButtons.appendChild(loadBtn); // Add load button
  headerButtons.appendChild(resetBtn); // Add reset button
  document.querySelector(".header").appendChild(headerButtons); // Append to header

  // Attach event listener for resting heroes, if the button exists
  if (restBtn) {
    restBtn.addEventListener("click", restHeroes); // Heal injured heroes
  }

  // Attach event listeners for game state management
  saveBtn.addEventListener("click", saveGame); // Save current game state
  loadBtn.addEventListener("click", loadGame); // Load saved game state
  resetBtn.addEventListener("click", resetGame); // Reset game to initial state

  // Add drag-over effects to hero roster for visual feedback
  heroRoster.addEventListener("dragover", () =>
    heroRoster.classList.add("dragover")
  );
  heroRoster.addEventListener("dragleave", () =>
    heroRoster.classList.remove("dragover")
  );
  heroRoster.addEventListener("drop", () =>
    heroRoster.classList.remove("dragover")
  );

  // Set up close button for hero stats panel
  if (closeHeroStatsBtn) {
    closeHeroStatsBtn.addEventListener("click", () => {
      heroStatsPanel.style.display = "none";
      modalOverlay.style.display = "none";
      heroStatsPanel.classList.remove("visible");
      gameState.selectedHero = null;
    });
  }

  // Initialize UI with current game state
  updateUI();
}

/**
 * Updates the UI to reflect the current game state.
 */
function updateUI() {
  // Update gold and day/night cycle displays
  goldAmount.textContent = gameState.gold;
  dayCount.textContent = `${gameState.cycle === "day" ? "Day" : "Night"} ${
    gameState.day
  }`;
  renderHeroRoster(); // Refresh hero roster display
  updateFormationGrid(); // Refresh formation grid display

  // Calculate and display the cost to rest injured heroes
  const injuredHeroes = gameState.heroes.filter((hero) => hero.hp < hero.maxHp);
  const cost = injuredHeroes.length * 20;
  restCostAmount.textContent = cost;
  restBtn.disabled = injuredHeroes.length === 0 || gameState.gold < cost; // Disable if no cost or no gold
}

/**
 * Returns the player to the main guild screen after viewing mission results.
 */
function returnToGuild() {
  // Hide results screen and show main screen
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  toggleCycle(); // Switch day/night cycle
  gameState.selectedDungeon = null; // Clear selected dungeon
  updateFormationGrid(); // Refresh formation UI
  renderHeroRoster(); // Refresh hero roster UI
  updateUI(); // Update all UI elements
}

/**
 * Allows the player to rest and heal injured heroes, deducting gold as needed.
 */
function restHeroes() {
  // Identify heroes needing healing
  const injuredHeroes = gameState.heroes.filter((hero) => hero.hp < hero.maxHp);
  const cost = injuredHeroes.length * 20; // Calculate cost (20 gold per hero)

  if (gameState.gold >= cost) {
    // Deduct gold and heal each injured hero
    gameState.gold -= cost;
    injuredHeroes.forEach((hero) => {
      const healAmount = Math.floor(hero.maxHp * 0.5); // Heal 50% of max HP
      hero.hp = Math.min(hero.maxHp, hero.hp + healAmount); // Cap at max HP
      addLogEntry(
        "heal",
        `${hero.name} rests and recovers ${healAmount} HP. (HP: ${hero.hp}/${hero.maxHp})`
      );
    });
    toggleCycle(); // Switch day/night cycle after resting
    updateUI(); // Refresh UI to reflect changes
  } else {
    // Notify player if they lack sufficient gold
    alert(
      `Not enough gold! Need ${cost} gold to rest (${gameState.gold} available).`
    );
  }
}

/**
 * Renders the hero roster, displaying available heroes not in the formation.
 */
function renderHeroRoster() {
  // Clear existing hero roster content
  heroRoster.innerHTML = "";
  gameState.heroes.forEach((hero) => {
    if (!isHeroInFormation(hero)) {
      // Only show heroes not in formation
      const heroEl = document.createElement("div");
      heroEl.className = `hero-base hero ${hero.class}${
        gameState.selectedHero === hero.id ? " selected" : ""
      }`;
      heroEl.dataset.id = hero.id; // Store hero ID for drag-and-drop
      heroEl.draggable = true; // Enable dragging for hero movement
      heroEl.innerHTML = `
        <div class="shape"></div>
        <div class="hero-info">${hero.name.split(" ")[0]}</div>
        <div class="level">Lv${hero.level}</div>
        <div class="hp-bar">
          <div class="hp-fill${
            hero.hp / hero.maxHp <= 0.3 ? " low" : ""
          }" style="width: ${Math.floor((hero.hp / hero.maxHp) * 100)}%;"></div>
        </div>
        <div class="xp-info">XP: ${hero.xp}/${xpThresholds[hero.level]}</div>
      `;
      heroEl.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("text/plain", hero.id)
      ); // Set drag data
      heroEl.addEventListener("click", () => selectHero(hero.id)); // Select hero on click
      heroRoster.appendChild(heroEl);
    }
  });
}

/**
 * Selects or deselects a hero for actions like moving to the formation.
 * @param {string} heroId - The ID of the hero to select or deselect.
 */
function selectHero(heroId) {
  // Toggle selection: null if already selected, otherwise set to the hero ID
  gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
  renderHeroRoster(); // Refresh hero roster to reflect selection
  updateFormationGrid(); // Refresh formation grid to show potential placement
  checkEmbarkButton(); // Update embark button state
}

/**
 * Handles clicks on formation slots, managing hero placement or removal.
 * @param {number} index - The index of the formation slot clicked.
 */
function handleFormationSlotClick(index) {
  const currentHeroId = gameState.formation[index]; // Get current hero in slot, if any
  if (currentHeroId && !gameState.selectedHero) {
    // Remove hero from slot if no hero is selected
    gameState.formation[index] = null;
  } else if (gameState.selectedHero && !currentHeroId) {
    // Place selected hero in empty slot
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null; // Clear selection after placement
  } else if (gameState.selectedHero && currentHeroId) {
    // Swap selected hero with hero in slot
    const slotWithSelected = gameState.formation.findIndex(
      (id) => id === gameState.selectedHero
    );
    if (slotWithSelected !== -1)
      gameState.formation[slotWithSelected] = currentHeroId;
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null; // Clear selection after swap
  }
  renderHeroRoster(); // Refresh hero roster after changes
  updateFormationGrid(); // Refresh formation grid after changes
  checkEmbarkButton(); // Update embark button state
}

/**
 * Updates the formation grid UI to reflect current hero placements.
 */
function updateFormationGrid() {
  // Get all formation slots and update each one
  const slots = formationGrid.querySelectorAll(".formation-slot");
  slots.forEach((slot, index) => {
    const heroId = gameState.formation[index]; // Get hero ID in this slot, if any
    slot.innerHTML = ""; // Clear existing content
    slot.classList.toggle("occupied", !!heroId); // Toggle occupied class based on presence
    if (heroId) {
      const hero = gameState.heroes.find((h) => h.id === heroId); // Find the corresponding hero
      if (hero) {
        const heroEl = document.createElement("div");
        heroEl.className = `hero-base hero ${hero.class}`; // Apply hero and class styling
        heroEl.dataset.id = hero.id; // Store hero ID for drag-and-drop
        heroEl.draggable = true; // Enable dragging for movement
        heroEl.innerHTML = `
          <div class="shape"></div>
          <div class="hero-info">${hero.name.split(" ")[0]}</div>
          <div class="level">Lv${hero.level}</div>
          <div class="hp-bar">
            <div class="hp-fill${
              hero.hp / hero.maxHp <= 0.3 ? " low" : ""
            }" style="width: ${Math.floor(
          (hero.hp / hero.maxHp) * 100
        )}%;"></div>
          </div>
        `;
        heroEl.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/plain", hero.id)
        ); // Set drag data
        heroEl.addEventListener("click", () => selectHero(hero.id)); // Select hero on click
        slot.appendChild(heroEl);
      }
    }
  });
}

/**
 * Handles drag-and-drop events for moving heroes between roster and formation.
 * @param {DragEvent} e - The drag event object.
 * @param {number|null} targetIndex - The target formation slot index or null for roster.
 */
function handleDrop(e, targetIndex) {
  e.preventDefault(); // Prevent default behavior to allow drop
  const heroId = e.dataTransfer.getData("text/plain"); // Get the dragged hero’s ID
  const hero = gameState.heroes.find((h) => h.id === heroId); // Find the corresponding hero
  if (!hero) return; // Exit if no hero is found

  const sourceIndex = gameState.formation.indexOf(heroId); // Find source slot in formation
  const targetHeroId =
    targetIndex !== null ? gameState.formation[targetIndex] : null; // Get target slot hero, if any

  if (targetIndex === null) {
    // Dropped on heroRoster: Remove hero from formation
    if (sourceIndex !== -1) {
      gameState.formation[sourceIndex] = null; // Clear the slot
    }
    // Do nothing if dragged from roster to roster (no action needed)
  } else if (sourceIndex === -1 && !targetHeroId) {
    // Dragging from roster to empty formation slot
    gameState.formation[targetIndex] = heroId; // Place hero in slot
  } else if (sourceIndex !== -1 && !targetHeroId) {
    // Dragging from formation to empty slot
    gameState.formation[sourceIndex] = null; // Clear source slot
    gameState.formation[targetIndex] = heroId; // Place in target slot
  } else if (sourceIndex !== -1 && targetHeroId) {
    // Swapping heroes within the formation grid
    gameState.formation[sourceIndex] = targetHeroId; // Move target to source
    gameState.formation[targetIndex] = heroId; // Move hero to target
  } else if (sourceIndex === -1 && targetHeroId) {
    // Dragging from roster to occupied slot (swap with roster)
    gameState.formation[targetIndex] = heroId; // Replace slot with new hero
  }

  gameState.selectedHero = null; // Clear any active hero selection
  renderHeroRoster(); // Refresh hero roster after drop
  updateFormationGrid(); // Refresh formation grid after drop
  checkEmbarkButton(); // Update embark button state
}

/**
 * Selects a dungeon for the player to embark on.
 * @param {Object} dungeon - The dungeon object to select.
 */
function selectDungeon(dungeon) {
  // Set the selected dungeon in game state
  gameState.selectedDungeon = dungeon;
  // Remove 'selected' class from all dungeons
  dungeonList
    .querySelectorAll(".dungeon")
    .forEach((el) => el.classList.remove("selected"));
  // Add 'selected' class to the chosen dungeon
  dungeonList.children[dungeons.indexOf(dungeon)].classList.add("selected");
  checkEmbarkButton(); // Update embark button state
}

/**
 * Checks and updates the state of the embark button based on formation and dungeon selection.
 */
function checkEmbarkButton() {
  // Disable embark button if no heroes are in formation or no dungeon is selected
  embarkBtn.disabled = !(
    gameState.formation.some((slot) => slot !== null) &&
    gameState.selectedDungeon
  );
}

/**
 * Shows the shop screen for recruiting new heroes.
 */
function showShopScreen() {
  // Hide main screen and show shop screen
  mainScreen.style.display = "none";
  shopScreen.style.display = "flex";
  renderShop(); // Populate shop with recruitable heroes
}

/**
 * Renders the shop screen with available heroes for recruitment.
 */
function renderShop() {
  // Get the recruit list container and clear existing content
  const recruitList = document.getElementById("recruit-list");
  recruitList.innerHTML = "";
  // Generate and display four random heroes for recruitment
  for (let i = 0; i < 4; i++) {
    const recruit = generateHero(); // Generate a new hero
    const recruitEl = document.createElement("div");
    recruitEl.className = `hero-base recruit-hero ${recruit.class}`; // Apply hero and class styling
    recruitEl.innerHTML = `
      <div class="shape"></div>
      <div class="hero-info">${recruit.name}</div>
      <div class="class-info">Class: ${capitalize(recruit.class)}</div>
      <div class="stats">HP: ${recruit.hp} | ATK: ${recruit.attack}</div>
      <div class="cost">${recruit.cost} Gold</div>
    `;
    recruitEl.addEventListener("click", () => recruitHero(recruit, recruitEl)); // Recruit hero on click
    recruitList.appendChild(recruitEl);
  }
}

/**
 * Recruits a hero if the player has sufficient gold, removing the hero from the shop.
 * @param {Object} recruit - The hero object to recruit.
 * @param {HTMLElement} element - The DOM element representing the hero in the shop.
 */
function recruitHero(recruit, element) {
  // Check if player has enough gold to recruit
  if (gameState.gold >= recruit.cost) {
    gameState.gold -= recruit.cost; // Deduct gold
    addHero(recruit); // Add hero to game state and UI
    element.remove(); // Remove hero from shop display
    updateUI(); // Refresh UI to reflect gold and roster changes
  } else {
    // Notify player if they lack sufficient gold
    alert("Not enough gold!");
  }
}

/**
 * Hides the shop screen and returns to the main guild screen.
 */
function hideShopScreen() {
  // Hide shop screen and show main screen
  shopScreen.style.display = "none";
  mainScreen.style.display = "block";
}

/**
 * Capitalizes the first letter of a string.
 * @param {string} str - The input string to capitalize.
 * @returns {string} The capitalized string.
 */
function capitalize(str) {
  // Return the string with the first character uppercase and the rest unchanged
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Selects or deselects a hero and updates the hero stats panel.
 * @param {string} heroId - The ID of the hero to select or deselect.
 */
function selectHero(heroId) {
  // Toggle hero selection: null if already selected, otherwise set to the hero ID
  gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
  renderHeroRoster(); // Refresh hero roster to reflect selection
  updateFormationGrid(); // Refresh formation grid to show potential placement
  updateHeroStatsPanel(); // Update detailed hero stats panel
  checkEmbarkButton(); // Update embark button state
}

/**
 * Updates the hero stats panel with details of the selected hero.
 */
function updateHeroStatsPanel() {
  // Hide panel, overlay, and remove visible class if no hero is selected
  if (!gameState.selectedHero) {
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    return;
  }

  // Find the selected hero in the game state
  const hero = gameState.heroes.find((h) => h.id === gameState.selectedHero);
  if (!hero) {
    console.error(
      "Hero not found in gameState.heroes for ID:",
      gameState.selectedHero
    );
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    gameState.selectedHero = null; // Clear invalid selection
    return;
  }

  // Show panel and overlay as a modal
  heroStatsPanel.style.display = "block";
  modalOverlay.style.display = "block";
  heroStatsPanel.classList.add("visible"); // Trigger animation

  // Find the hero’s class, passive, and skill details
  const heroClass = heroClasses.find((hc) => hc.type === hero.class);
  const passive = heroPassives.find((p) => p.name === hero.passive);
  const skill = heroSkills.find((s) => s.name === hero.special);
  
  // Build HTML for detailed hero stats with improved formatting
  heroStatsContent.innerHTML = `
    <div class="hero-stat-item"><strong>Name:</strong> ${hero.name}</div>
    <div class="hero-stat-item"><strong>Class:</strong> ${capitalize(
      hero.class
    )}</div>
    <div class="hero-stat-item"><strong>Level:</strong> ${hero.level}</div>
    <div class="hero-stat-item"><strong>XP:</strong> ${hero.xp}/${
    xpThresholds[hero.level]
  }</div>
    <div class="hero-stat-item"><strong>HP:</strong> ${hero.hp}/${
    hero.maxHp
  }</div>
    <div class="hero-stat-item"><strong>Attack:</strong> ${hero.attack}</div>
    <div class="hero-stat-item"><strong>Hit Chance:</strong> ${Math.floor(
      hero.hitChance * 100
    )}%</div>
    <div class="hero-stat-item"><strong>Special:</strong> ${hero.special} - ${
    skill ? skill.description : "No description"
  }</div>
    <div class="hero-stat-item"><strong>Special Cooldown:</strong> ${
      skill ? skill.cooldown : 0
    } turns</div>
    <div class="hero-stat-item"><strong>Passive:</strong> ${hero.passive} - ${
    passive ? passive.description : "No description"
  }</div>
  `;

  // Ensure close button functionality (re-attach in case of multiple clicks)
  if (closeHeroStatsBtn) {
    closeHeroStatsBtn.addEventListener(
      "click",
      () => {
        heroStatsPanel.style.display = "none";
        modalOverlay.style.display = "none";
        heroStatsPanel.classList.remove("visible"); // Remove visible class for animation
        gameState.selectedHero = null; // Clear selection on close
      },
      { once: true }
    ); // Use { once: true } to prevent multiple listeners stacking
  }
}
