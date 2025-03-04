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

// Store buttons in an array for easier management
const headerButtons = [saveBtn, loadBtn, resetBtn];

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

  headerButtonsContainer = document.createElement("div");
  headerButtonsContainer.style.display = "flex";
  headerButtonsContainer.style.gap = "10px";
  headerButtonsContainer.append(saveBtn, loadBtn, resetBtn);
  document.querySelector(".header").appendChild(headerButtonsContainer);

  showHeaderButtons();

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

// Helper function to show header buttons
function showHeaderButtons() {
  if (!headerButtonsContainer) {
    console.error(
      "headerButtonsContainer is null or undefined, attempting to recreate..."
    );
    const header = document.querySelector(".header");
    if (header) {
      headerButtonsContainer = document.createElement("div");
      headerButtonsContainer.style.display = "flex";
      headerButtonsContainer.style.gap = "10px";
      headerButtonsContainer.append(saveBtn, loadBtn, resetBtn);
      header.appendChild(headerButtonsContainer);
    } else {
      console.error(".header not found, cannot recreate buttons.");
      return;
    }
  }

  headerButtons.forEach((btn, index) => {
    if (btn && headerButtonsContainer.contains(btn)) {
      btn.style.display = "inline-block";
    } else {
      console.warn(
        `Button ${index} not found in headerButtonsContainer, recreating...`
      );
      const newBtn = document.createElement("button");
      if (index === 0) {
        newBtn.textContent = "SAVE";
        newBtn.className = "primary";
      } else if (index === 1) {
        newBtn.textContent = "LOAD";
        newBtn.className = "primary";
      } else if (index === 2) {
        newBtn.textContent = "RESET";
        newBtn.className = "primary";
      }
      headerButtons[index] = newBtn;
      headerButtonsContainer.appendChild(newBtn);
      newBtn.style.display = "inline-block";
    }
  });
}

// Helper function to hide header buttons
function hideHeaderButtons() {
  if (headerButtonsContainer) {
    headerButtons.forEach((btn) => {
      if (btn && headerButtonsContainer.contains(btn)) {
        btn.style.display = "none";
      }
    });
  }
}

// Updates UI to reflect game state
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

  // Trigger animation for updated panels
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.remove("animate-in");
    setTimeout(() => panel.classList.add("animate-in"), 10);
  });
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
      el.dataset.tooltip = `
        ${hero.name}
        ${capitalize(hero.class)}
        Lv${hero.level}
        HP: ${hero.hp}/${hero.maxHp}
        ATK: ${hero.attack}
      `.trim();
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

      updateHeroTooltipListeners(el);

      heroRoster.appendChild(el);
    }
  });
}

/**
 * @param {string} heroId - Hero ID to select/deselect
 */
function selectHero(heroId) {
  const tooltip = document.getElementById("hero-tooltip");
  if (tooltip) {
    tooltip.style.opacity = "0";
    tooltip.style.display = "none";
  }
  currentHoveredHero = null;
  clearTimeout(hideTooltipTimeout);

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
          hpPercentage < 0.25
            ? "red"
            : hpPercentage <= 0.6
            ? "yellow"
            : "green";

        const el = document.createElement("div");
        el.className = `hero-base hero ${hero.class}`;
        el.dataset.id = hero.id;
        el.draggable = true;
        el.style.width = "4.5rem";
        el.style.height = "4.5rem";
        el.dataset.tooltip = `
          ${hero.name}
          ${capitalize(hero.class)}
          Lv${hero.level}
          HP: ${hero.hp}/${hero.maxHp}
          ATK: ${hero.attack}
          SPD: ${hero.speed}
        `.trim();
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

        updateHeroTooltipListeners(el);

        slot.appendChild(el);
      }
    }
  });
}

let tooltipTimeout;
let currentHoveredHero = null;
let hideTooltipTimeout = null;
let mouseMoveHandler = null;

function showTooltip(e) {
  const hero = e.currentTarget;
  if (hideTooltipTimeout) {
    clearTimeout(hideTooltipTimeout);
    hideTooltipTimeout = null;
  }

  currentHoveredHero = hero;

  const tooltipText = hero.dataset.tooltip;
  let tooltip = document.getElementById("hero-tooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "hero-tooltip";
    tooltip.className = "hero-tooltip";
    document.body.appendChild(tooltip);
  }

  tooltip.innerHTML = tooltipText
    .split("\n")
    .map((line) => `<div>${line}</div>`)
    .join("");

  tooltip.style.pointerEvents = "none";

  updateTooltipPosition(e);

  tooltip.classList.add("visible");
  tooltip.style.display = "block";
  tooltip.style.opacity = "1";
  tooltip.style.transition = "opacity 0.2s ease-in-out";

  if (!mouseMoveHandler) {
    mouseMoveHandler = (event) => updateTooltipPosition(event);
    document.addEventListener("mousemove", mouseMoveHandler);
  }
}

function updateTooltipPosition(e) {
  const tooltip = document.getElementById("hero-tooltip");
  if (!tooltip || !currentHoveredHero) return;

  const mouseX = e.clientX;
  const mouseY = e.clientY;
  const tooltipRect = tooltip.getBoundingClientRect();

  tooltip.style.left = `${mouseX + 10}px`;
  tooltip.style.top = `${mouseY + 10}px`;

  if (tooltipRect.right > window.innerWidth) {
    tooltip.style.left = `${mouseX - tooltipRect.width - 10}px`;
  }
  if (tooltipRect.bottom > window.innerHeight) {
    tooltip.style.top = `${mouseY - tooltipRect.height - 10}px`;
  }
}

function hideTooltip() {
  const tooltip = document.getElementById("hero-tooltip");
  if (!tooltip || currentHoveredHero) return;

  tooltip.classList.remove("visible");
  tooltip.style.opacity = "0";
  hideTooltipTimeout = setTimeout(() => {
    if (tooltip) {
      tooltip.style.display = "none";
      if (mouseMoveHandler) {
        document.removeEventListener("mousemove", mouseMoveHandler);
        mouseMoveHandler = null;
      }
    }
    hideTooltipTimeout = null;
  }, 200);
}

let touchStartTime;

function handleTouchStart(e) {
  touchStartTime = Date.now();
  const hero = e.currentTarget;
  tooltipTimeout = setTimeout(() => showTooltip(e), 500);
  const touchMoveHandler = (event) => {
    const touch = event.touches[0];
    updateTooltipPosition({ clientX: touch.clientX, clientY: touch.clientY });
  };
  hero.addEventListener("touchmove", touchMoveHandler, { passive: true });
  hero.dataset.touchMoveHandler = touchMoveHandler;
}

function handleTouchEnd(e) {
  clearTimeout(tooltipTimeout);
  if (Date.now() - touchStartTime < 500) {
    selectHero(e.currentTarget.dataset.id);
  } else {
    hideTooltip();
  }
  touchStartTime = null;
  const hero = e.currentTarget;
  if (hero.dataset.touchMoveHandler) {
    hero.removeEventListener("touchmove", hero.dataset.touchMoveHandler);
    delete hero.dataset.touchMoveHandler;
  }
}

function updateHeroTooltipListeners(heroElement) {
  heroElement.addEventListener("mouseenter", showTooltip);
  heroElement.addEventListener("mouseleave", () => {
    currentHoveredHero = null;
    hideTooltip();
  });
  heroElement.addEventListener("touchstart", handleTouchStart, {
    passive: true,
  });
  heroElement.addEventListener("touchend", handleTouchEnd, { passive: true });
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
  if (!recruitList) {
    console.error("recruit-list not found in DOM!");
    return;
  }
  recruitList.innerHTML = "";
  for (let i = 0; i < 4; i++) {
    const hero = generateHero();
    const el = document.createElement("div");
    el.className = `hero-base recruit-hero ${hero.class} animate-in`;
    el.innerHTML = `
      <div class="shape"></div>
      <div class="hero-info">${hero.name}</div>
      <div class="class-info">Class: ${capitalize(hero.class)}</div>
      <div class="tier-info">Tier: ${hero.tier}</div>
      <div class="level">Lv${hero.level}</div>
      <div class="cost">${hero.cost} Gold</div>
    `;
    el.addEventListener("click", () => recruitHero(hero, el));
    recruitList.appendChild(el);
  }
  setTimeout(
    () =>
      document
        .querySelectorAll(".recruit-hero")
        .forEach((hero) => hero.classList.add("visible")),
    10
  );
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

function returnToGuild() {
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  toggleCycle();
  gameState.selectedDungeon = null;
  updateFormationGrid();
  renderHeroRoster();
  updateUI();

  // Reattach or recreate headerButtonsContainer if missing
  const header = document.querySelector(".header");
  if (!header) {
    console.error(".header not found in DOM!");
    return;
  }

  if (!headerButtonsContainer || !header.contains(headerButtonsContainer)) {
    if (headerButtonsContainer) {
      headerButtonsContainer.remove(); // Clean up any orphaned container
    }
    headerButtonsContainer = document.createElement("div");
    headerButtonsContainer.style.display = "flex";
    headerButtonsContainer.style.gap = "10px";
    headerButtonsContainer.append(saveBtn, loadBtn, resetBtn);
    header.appendChild(headerButtonsContainer);
  }

  showHeaderButtons();
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function preventScroll(e) {
  e.preventDefault();
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

  const isMobile = window.innerWidth <= 37.5;
  if (isMobile) {
    heroStatsPanel.style.position = "absolute";
    heroStatsPanel.style.top = "10px";
    heroStatsPanel.style.left = "10px";
    heroStatsPanel.style.right = "10px";
    heroStatsPanel.style.bottom = "auto";
    heroStatsPanel.style.transform = "none";
    heroStatsPanel.style.width = "auto";
    heroStatsPanel.style.maxWidth = "calc(100vw - 20px)";
    heroStatsPanel.style.maxHeight = "calc(100vh - 20px)";
    heroStatsPanel.className = `hero-stats-panel visible ${hero.class}`;
  } else {
    heroStatsPanel.style.position = "fixed";
    heroStatsPanel.style.top = "50%";
    heroStatsPanel.style.left = "50%";
    heroStatsPanel.style.transform = "translate(-50%, -50%)";
    heroStatsPanel.style.width = "20rem";
    heroStatsPanel.style.maxHeight = "80vh";
    heroStatsPanel.style.right = "auto";
    heroStatsPanel.style.bottom = "auto";
    heroStatsPanel.className = `hero-stats-panel visible ${hero.class}`;
  }

  const heroClass = heroClasses.find((hc) => hc.type === hero.class);
  const passive = heroPassives.find((p) => p.name === hero.passive);
  const skill = heroSkills.find((s) => s.name === hero.special);

  heroStatsContent.innerHTML = `
    <div class="hero-stat-item"><strong>Name:</strong> ${hero.name}</div>
    <div class="hero-stat-item"><strong>Class:</strong> ${capitalize(
      hero.class
    )}</div>
    <div class="hero-stat-item"><strong>Tier:</strong> ${
      hero.tier
    }</div>
    <div class="hero-stat-item"><strong>Level:</strong> ${hero.level}</div>
    <div class="hero-stat-item"><strong>XP:</strong> ${hero.xp}/${
    xpThresholds[hero.level]
  }</div>
    <div class="hero-stat-item"><strong>HP:</strong> ${hero.hp}/${
    hero.maxHp
  }</div>
    <div class="hero-stat-item"><strong>Attack:</strong> ${hero.attack}</div>
    <div class="hero-stat-item"><strong>Speed:</strong> ${hero.speed}</div>
    <div class="hero-stat-item"><strong>Hit Chance:</strong> ${Math.floor(
      hero.hitChance * 100
    )}%</div>
    <div class="hero-stat-item special-item"><strong>Special:</strong> ${
      hero.special
    } - ${skill?.description || "No description"} (Charges: ${hero.charges}/${
    skill.maxCharges
  })</div>
    <div class="hero-stat-item passive-item"><strong>Passive:</strong> ${
      hero.passive
    } - ${passive?.description || "No description"}</div>
  `;

  setTimeout(() => heroStatsPanel.classList.add("animate-in"), 10);

  if (isMobile) {
    modalOverlay.addEventListener("touchmove", preventScroll, {
      passive: false,
    });
  } else {
    modalOverlay.removeEventListener("touchmove", preventScroll);
  }
}

function preventScroll(e) {
  e.preventDefault();
}
