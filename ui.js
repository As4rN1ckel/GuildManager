// UI management and rendering functions for the game.

// DOM elements for UI components
const heroRoster = document.getElementById("hero-roster"); // Hero roster display
const formationGrid = document.getElementById("formation-grid"); // Formation grid
const dungeonList = document.getElementById("dungeon-list"); // Dungeon list
const recruitBtn = document.getElementById("recruit-btn"); // Recruit heroes button
const embarkBtn = document.getElementById("embark-btn"); // Start mission button
const continueBtn = document.getElementById("continue-btn"); // Return to guild button
const backToGuildBtn = document.getElementById("back-to-guild-btn"); // Back to guild button
const goldAmount = document.getElementById("gold-amount"); // Gold display
const dayCount = document.getElementById("day-count"); // Day/night display
const mainScreen = document.getElementById("main-screen"); // Main game screen
const battleScreen = document.getElementById("battle-screen"); // Battle screen
const resultsScreen = document.getElementById("results-screen"); // Results screen
const shopScreen = document.getElementById("shop-screen"); // Shop screen
const heroStatsPanel = document.getElementById("hero-stats-panel"); // Hero stats panel
const heroStatsContent = document.getElementById("hero-stats-content"); // Stats content
const modalOverlay = document.getElementById("modal-overlay"); // Modal overlay
const closeHeroStatsBtn = document.getElementById("close-hero-stats"); // Close stats button

// Dynamic buttons for game management
const saveBtn = document.createElement("button");
saveBtn.textContent = "SAVE";
saveBtn.className = "primary";

const loadBtn = document.createElement("button");
loadBtn.textContent = "LOAD";
loadBtn.className = "primary";

const resetBtn = document.createElement("button");
resetBtn.textContent = "RESET";
resetBtn.className = "primary";

const restBtn = document.getElementById("rest-btn"); // Rest button
const restCostAmount = document.getElementById("rest-cost-amount"); // Rest cost display

/**
 * Initializes the game UI with event listeners and initial content.
 */
function initGame() {
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
    !restBtn ||
    !restCostAmount
  ) {
    console.error("Missing UI elements.");
    return;
  }

  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`; // Set initial speed

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "formation-slot";
    slot.dataset.index = i; // For drag-and-drop
    slot.addEventListener("dragover", (e) => e.preventDefault());
    slot.addEventListener("drop", (e) => handleDrop(e, i));
    formationGrid.appendChild(slot);
  }

  heroRoster.addEventListener("dragover", (e) => e.preventDefault());
  heroRoster.addEventListener("drop", (e) => handleDrop(e, null));

  dungeons.forEach((dungeon) => {
    const el = document.createElement("div");
    el.className = "dungeon";
    el.innerHTML = `<div><strong>${dungeon.name}</strong> (${dungeon.difficulty})<div>${dungeon.description}</div></div><div>Reward: ${dungeon.reward} Gold</div>`;
    el.addEventListener("click", () => selectDungeon(dungeon));
    dungeonList.appendChild(el);
  });

  recruitBtn.addEventListener("click", showShopScreen);
  embarkBtn.addEventListener("click", startMission);
  speedBtn.addEventListener("click", toggleBattleSpeed);
  continueBtn.addEventListener("click", returnToGuild);
  backToGuildBtn.addEventListener("click", hideShopScreen);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "10px";
  headerButtons.appendChild(saveBtn);
  headerButtons.appendChild(loadBtn);
  headerButtons.appendChild(resetBtn);
  document.querySelector(".header").appendChild(headerButtons);

  if (restBtn) restBtn.addEventListener("click", restHeroes);
  saveBtn.addEventListener("click", saveGame);
  loadBtn.addEventListener("click", loadGame);
  resetBtn.addEventListener("click", resetGame);

  heroRoster.addEventListener("dragover", () =>
    heroRoster.classList.add("dragover")
  );
  heroRoster.addEventListener("dragleave", () =>
    heroRoster.classList.remove("dragover")
  );
  heroRoster.addEventListener("drop", () =>
    heroRoster.classList.remove("dragover")
  );

  if (closeHeroStatsBtn) {
    closeHeroStatsBtn.addEventListener("click", () => {
      heroStatsPanel.style.display = "none";
      modalOverlay.style.display = "none";
      heroStatsPanel.classList.remove("visible");
      gameState.selectedHero = null;
    });
  }

  updateUI(); // Initialize UI state
}

/**
 * Updates UI to reflect current game state.
 */
function updateUI() {
  goldAmount.textContent = gameState.gold;
  dayCount.textContent = `${gameState.cycle === "day" ? "Day" : "Night"} ${
    gameState.day
  }`;
  renderHeroRoster();
  updateFormationGrid();

  const injured = gameState.heroes.filter((hero) => hero.hp < hero.maxHp);
  const cost = injured.length * 20;
  restCostAmount.textContent = cost;
  restBtn.disabled = !injured.length || gameState.gold < cost;
}

/**
 * Returns to the guild screen after mission results.
 */
function returnToGuild() {
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  toggleCycle();
  gameState.selectedDungeon = null;
  updateFormationGrid();
  renderHeroRoster();
  updateUI();
}

/**
 * Rests and heals injured heroes, deducting gold if affordable.
 */
function restHeroes() {
  const injured = gameState.heroes.filter((hero) => hero.hp < hero.maxHp);
  const cost = injured.length * 20;

  if (gameState.gold >= cost) {
    gameState.gold -= cost;
    injured.forEach((hero) => {
      const heal = Math.floor(hero.maxHp * 0.5);
      hero.hp = Math.min(hero.maxHp, hero.hp + heal);
      addLogEntry(
        "heal",
        `${hero.name} rests, recovering ${heal} HP. (HP: ${hero.hp}/${hero.maxHp})`
      );
    });
    toggleCycle();
    updateUI();
  } else {
    alert(`Not enough gold! Need ${cost} (${gameState.gold} available).`);
  }
}

/**
 * Renders available heroes not in formation.
 */
function renderHeroRoster() {
  heroRoster.innerHTML = "";
  gameState.heroes.forEach((hero) => {
    if (!isHeroInFormation(hero)) {
      const hpPercentage = hero.hp / hero.maxHp;
      let hpClass = "green";
      if (hpPercentage <= 0.6) hpClass = "yellow"; 
      if (hpPercentage < 0.25) hpClass = "red"; 

      const el = document.createElement("div");
      el.className = `hero-base hero ${hero.class}${
        gameState.selectedHero === hero.id ? " selected" : ""
      }`;
      el.dataset.id = hero.id; // For drag-and-drop
      el.draggable = true;
      el.innerHTML = `
        <div class="shape"></div>
        <div class="hero-info">${hero.name.split(" ")[0]}</div>
        <div class="level">Lv${hero.level}</div>
        <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.floor(
          hpPercentage * 100
        )}%;"></div></div>
      `;
      el.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("text/plain", hero.id)
      );
      el.addEventListener("click", () => selectHero(hero.id));
      heroRoster.appendChild(el);
    }
  });
}

/**
 * Selects or deselects a hero, updating UI.
 * @param {string} heroId - Hero ID to select/deselect.
 */
function selectHero(heroId) {
  gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
  renderHeroRoster();
  updateFormationGrid();
  updateHeroStatsPanel();
  checkEmbarkButton();
}

/**
 * Manages hero placement or removal in formation slots.
 * @param {number} index - Formation slot index.
 */
function handleFormationSlotClick(index) {
  const current = gameState.formation[index];
  if (current && !gameState.selectedHero) {
    gameState.formation[index] = null; // Remove hero
  } else if (gameState.selectedHero && !current) {
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null; // Clear selection
  } else if (gameState.selectedHero && current) {
    const slot = gameState.formation.findIndex(
      (id) => id === gameState.selectedHero
    );
    if (slot !== -1) gameState.formation[slot] = current;
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null; // Clear selection
  }
  renderHeroRoster();
  updateFormationGrid();
  checkEmbarkButton();
}

/**
 * Updates the formation grid UI with current hero placements.
 */
function updateFormationGrid() {
  const slots = formationGrid.querySelectorAll(".formation-slot");
  slots.forEach((slot, index) => {
    const heroId = gameState.formation[index];
    slot.innerHTML = "";
    slot.classList.toggle("occupied", !!heroId);
    if (heroId) {
      const hero = gameState.heroes.find((h) => h.id === heroId);
      if (hero) {
        const hpPercentage = hero.hp / hero.maxHp;
        let hpClass = "green";
        if (hpPercentage <= 0.5) hpClass = "yellow"; // 50% or less
        if (hpPercentage < 0.25) hpClass = "red";   // Less than 25%

        const el = document.createElement("div");
        el.className = `hero-base hero ${hero.class}`;
        el.dataset.id = hero.id; // For drag-and-drop
        el.draggable = true;
        el.innerHTML = `
          <div class="shape"></div>
          <div class="hero-info">${hero.name.split(" ")[0]}</div>
          <div class="level">Lv${hero.level}</div>
          <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.floor(
            hpPercentage * 100
          )}%;"></div></div>
        `;
        el.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/plain", hero.id)
        );
        el.addEventListener("click", () => selectHero(hero.id));
        slot.appendChild(el);
      }
    }
  });
}

/**
 * Handles hero drag-and-drop between roster and formation.
 * @param {DragEvent} e - Drag event.
 * @param {number|null} targetIndex - Target slot index or null for roster.
 */
function handleDrop(e, targetIndex) {
  e.preventDefault();
  const heroId = e.dataTransfer.getData("text/plain");
  const hero = gameState.heroes.find((h) => h.id === heroId);
  if (!hero) return;

  const source = gameState.formation.indexOf(heroId);
  const targetHero =
    targetIndex !== null ? gameState.formation[targetIndex] : null;

  if (targetIndex === null) {
    if (source !== -1) gameState.formation[source] = null; // Remove from formation
  } else if (source === -1 && !targetHero) {
    gameState.formation[targetIndex] = heroId; // Place in empty slot
  } else if (source !== -1 && !targetHero) {
    gameState.formation[source] = null; // Clear source
    gameState.formation[targetIndex] = heroId; // Move to target
  } else if (source !== -1 && targetHero) {
    gameState.formation[source] = targetHero; // Swap within grid
    gameState.formation[targetIndex] = heroId;
  } else if (source === -1 && targetHero) {
    gameState.formation[targetIndex] = heroId; // Swap with roster
  }

  gameState.selectedHero = null; // Clear selection
  renderHeroRoster();
  updateFormationGrid();
  checkEmbarkButton();
}

/**
 * Selects a dungeon for the mission.
 * @param {Object} dungeon - Dungeon to select.
 */
function selectDungeon(dungeon) {
  gameState.selectedDungeon = dungeon;
  dungeonList
    .querySelectorAll(".dungeon")
    .forEach((el) => el.classList.remove("selected"));
  dungeonList.children[dungeons.indexOf(dungeon)].classList.add("selected");
  checkEmbarkButton();
}

/**
 * Enables/disables the embark button based on formation and dungeon.
 */
function checkEmbarkButton() {
  embarkBtn.disabled = !(
    gameState.formation.some((slot) => slot !== null) &&
    gameState.selectedDungeon
  );
}

/**
 * Shows the hero recruitment shop.
 */
function showShopScreen() {
  mainScreen.style.display = "none";
  shopScreen.style.display = "flex";
  renderShop();
}

/**
 * Displays available heroes in the shop.
 */
function renderShop() {
  const recruitList = document.getElementById("recruit-list");
  recruitList.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const hero = generateHero();
    const el = document.createElement("div");
    el.className = `hero-base recruit-hero ${hero.class}`;
    el.innerHTML = `
      <div class="shape"></div>
      <div class="hero-info">${hero.name}</div>
      <div class="class-info">Class: ${capitalize(hero.class)}</div>
      <div class="stats">HP: ${hero.hp} | ATK: ${hero.attack}</div>
      <div class="cost">${hero.cost} Gold</div>
    `;
    el.addEventListener("click", () => recruitHero(hero, el));
    recruitList.appendChild(el);
  }
}

/**
 * Recruits a hero if gold is sufficient.
 * @param {Object} hero - Hero to recruit.
 * @param {HTMLElement} element - Shop element to remove.
 */
function recruitHero(hero, element) {
  if (gameState.gold >= hero.cost) {
    gameState.gold -= hero.cost;
    addHero(hero);
    element.remove();
    updateUI();
  } else {
    alert("Not enough gold!");
  }
}

/**
 * Hides the shop and returns to the main screen.
 */
function hideShopScreen() {
  shopScreen.style.display = "none";
  mainScreen.style.display = "block";
}

/**
 * Capitalizes a string’s first letter.
 * @param {string} str - Input string.
 * @returns {string} Capitalized string.
 */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Updates the hero stats modal for the selected hero.
 */
function updateHeroStatsPanel() {
  if (!gameState.selectedHero) {
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    return;
  }

  const hero = gameState.heroes.find((h) => h.id === gameState.selectedHero);
  if (!hero) {
    console.error("Hero not found:", gameState.selectedHero);
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    gameState.selectedHero = null; // Clear invalid selection
    return;
  }

  heroStatsPanel.style.display = "block";
  modalOverlay.style.display = "block";
  heroStatsPanel.classList.add("visible");

  const heroClass = heroClasses.find((hc) => hc.type === hero.class);
  const passive = heroPassives.find((p) => p.name === hero.passive);
  const skill = heroSkills.find((s) => s.name === hero.special);

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
    skill?.description || "No description"
  }</div>
    <div class="hero-stat-item"><strong>Cooldown:</strong> ${
      skill?.cooldown || 0
    } turns</div>
    <div class="hero-stat-item"><strong>Passive:</strong> ${hero.passive} - ${
    passive?.description || "No description"
  }</div>
  `;

  if (closeHeroStatsBtn) {
    closeHeroStatsBtn.addEventListener(
      "click",
      () => {
        heroStatsPanel.style.display = "none";
        modalOverlay.style.display = "none";
        heroStatsPanel.classList.remove("visible");
        gameState.selectedHero = null;
      },
      { once: true }
    );
  }
}
