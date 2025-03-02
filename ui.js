// DOM Elements
const heroRoster = document.getElementById("hero-roster");
const formationGrid = document.getElementById("formation-grid");
const dungeonList = document.getElementById("dungeon-list");
const recruitBtn = document.getElementById("recruit-btn");
const embarkBtn = document.getElementById("embark-btn");
const continueBtn = document.getElementById("continue-btn");
const backToGuildBtn = document.getElementById("back-to-guild-btn");
const goldAmount = document.getElementById("gold-amount");
const dayCount = document.getElementById("day-count");
const mainScreen = document.getElementById("main-screen");
const battleScreen = document.getElementById("battle-screen");
const resultsScreen = document.getElementById("results-screen");
const shopScreen = document.getElementById("shop-screen");
const heroStatsPanel = document.getElementById("hero-stats-panel");
const heroStatsContent = document.getElementById("hero-stats-content");
const modalOverlay = document.getElementById("modal-overlay");
const closeHeroStatsBtn = document.getElementById("close-hero-stats");
const restBtn = document.getElementById("rest-btn");
const restCostAmount = document.getElementById("rest-cost-amount");

// Dynamic Buttons
const saveBtn = document.createElement("button");
saveBtn.textContent = "SAVE";
saveBtn.className = "primary";

const loadBtn = document.createElement("button");
loadBtn.textContent = "LOAD";
loadBtn.className = "primary";

const resetBtn = document.createElement("button");
resetBtn.textContent = "RESET";
resetBtn.className = "primary";

// Initializes game UI with event listeners and content
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

  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement("div");
    slot.className = "formation-slot";
    slot.dataset.index = i;
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
  restBtn.addEventListener("click", restHeroes);
  saveBtn.addEventListener("click", saveGame);
  loadBtn.addEventListener("click", loadGame);
  resetBtn.addEventListener("click", resetGame);

  const headerButtons = document.createElement("div");
  headerButtons.style.display = "flex";
  headerButtons.style.gap = "10px";
  headerButtons.append(saveBtn, loadBtn, resetBtn);
  document.querySelector(".header").appendChild(headerButtons);

  heroRoster.addEventListener("dragover", () =>
    heroRoster.classList.add("dragover")
  );
  heroRoster.addEventListener("dragleave", () =>
    heroRoster.classList.remove("dragover")
  );
  heroRoster.addEventListener("drop", () =>
    heroRoster.classList.remove("dragover")
  );

  closeHeroStatsBtn.addEventListener("click", () => {
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    gameState.selectedHero = null;
  });

  updateUI();
}

// Updates UI to reflect game state
function updateUI() {
  goldAmount.textContent = gameState.gold;
  dayCount.textContent = `${gameState.cycle === "day" ? "Day" : "Night"} ${gameState.day}`;
  renderHeroRoster();
  updateFormationGrid();

  const injured = gameState.heroes.filter((hero) => hero.hp < hero.maxHp);
  const cost = injured.length * 20;
  restCostAmount.textContent = cost;
  restBtn.disabled = !injured.length || gameState.gold < cost;

  // Trigger animation for updated panels
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("animate-in");
    setTimeout(() => panel.classList.add("animate-in"), 10);
  });
}

function returnToGuild() {
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  toggleCycle();
  gameState.selectedDungeon = null;
  updateFormationGrid();
  renderHeroRoster();
  updateUI();
}

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

function renderHeroRoster() {
  heroRoster.innerHTML = "";
  gameState.heroes.forEach((hero) => {
    if (!isHeroInFormation(hero)) {
      const hpPercentage = hero.hp / hero.maxHp;
      const hpClass =
        hpPercentage <= 0.6
          ? hpPercentage < 0.25
            ? "red"
            : "yellow"
          : "green";

      const el = document.createElement("div");
      el.className = `hero-base hero ${hero.class}${
        gameState.selectedHero === hero.id ? " selected" : ""
      }`;
      el.dataset.id = hero.id;
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
 * @param {string} heroId - Hero ID to select/deselect
 */
function selectHero(heroId) {
  gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
  renderHeroRoster();
  updateFormationGrid();
  updateHeroStatsPanel();
  checkEmbarkButton();
}

/**
 * @param {number} index - Formation slot index
 */
function handleFormationSlotClick(index) {
  const current = gameState.formation[index];
  if (current && !gameState.selectedHero) {
    gameState.formation[index] = null;
  } else if (gameState.selectedHero && !current) {
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null;
  } else if (gameState.selectedHero && current) {
    const slot = gameState.formation.findIndex(
      (id) => id === gameState.selectedHero
    );
    if (slot !== -1) gameState.formation[slot] = current;
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null;
  }
  renderHeroRoster();
  updateFormationGrid();
  checkEmbarkButton();
}

function updateFormationGrid() {
  const existingLabels = formationGrid.querySelectorAll(".row-label");
  if (existingLabels.length === 0) {
    const labels = [
      { text: "Front Row", row: 1 },
      { text: "Middle Row", row: 3 },
      { text: "Back Row", row: 5 },
    ];
    labels.forEach((label) => {
      const labelEl = document.createElement("div");
      labelEl.className = "row-label";
      labelEl.textContent = label.text;
      labelEl.style.gridRow = label.row;
      labelEl.style.gridColumn = "1 / span 3";
      formationGrid.appendChild(labelEl);
    });
  }

  const slots = formationGrid.querySelectorAll(".formation-slot");
  slots.forEach((slot, index) => {
    const heroId = gameState.formation[index];
    slot.innerHTML = "";
    slot.classList.toggle("occupied", !!heroId);
    if (heroId) {
      const hero = gameState.heroes.find((h) => h.id === heroId);
      if (hero) {
        const hpPercentage = hero.hp / hero.maxHp;
        const hpClass =
          hpPercentage <= 0.6
            ? hpPercentage < 0.25
              ? "red"
              : "yellow"
            : "green";

        const el = document.createElement("div");
        el.className = `hero-base hero ${hero.class}`;
        el.dataset.id = hero.id;
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
 * @param {DragEvent} e - Drag event
 * @param {number|null} targetIndex - Target slot index or null for roster
 */
function handleDrop(e, targetIndex) {
  e.preventDefault();
  const heroId = e.dataTransfer.getData("text/plain");
  const hero = gameState.heroes.find((h) => h.id === heroId);
  if (!hero) return;

  const source = gameState.formation.indexOf(heroId);
  const targetHero =
    targetIndex !== null ? gameState.formation[targetIndex] : null;

  if (targetIndex === null && source !== -1) {
    gameState.formation[source] = null;
  } else if (source === -1 && !targetHero) {
    gameState.formation[targetIndex] = heroId;
  } else if (source !== -1 && !targetHero) {
    gameState.formation[source] = null;
    gameState.formation[targetIndex] = heroId;
  } else if (source !== -1 && targetHero) {
    gameState.formation[source] = targetHero;
    gameState.formation[targetIndex] = heroId;
  } else if (source === -1 && targetHero) {
    gameState.formation[targetIndex] = heroId;
  }

  gameState.selectedHero = null;
  renderHeroRoster();
  updateFormationGrid();
  checkEmbarkButton();
}

/**
 * @param {Object} dungeon - Dungeon to select
 */
function selectDungeon(dungeon) {
  gameState.selectedDungeon = dungeon;
  dungeonList
    .querySelectorAll(".dungeon")
    .forEach((el) => el.classList.remove("selected"));
  dungeonList.children[dungeons.indexOf(dungeon)].classList.add("selected");
  checkEmbarkButton();
}

function checkEmbarkButton() {
  embarkBtn.disabled = !(
    gameState.formation.some((slot) => slot !== null) &&
    gameState.selectedDungeon
  );
}

function showShopScreen() {
  mainScreen.style.display = "none";
  shopScreen.style.display = "flex";
  renderShop();
}

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
 * @param {Object} hero - Hero to recruit
 * @param {HTMLElement} element - Shop element to remove
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

function hideShopScreen() {
  shopScreen.style.display = "none";
  mainScreen.style.display = "block";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
    gameState.selectedHero = null;
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
}
