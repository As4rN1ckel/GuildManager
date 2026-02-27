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

const headerButtons = [saveBtn, loadBtn, resetBtn];

// Tab Variables
let activeTab = "dungeons"; // "dungeons" | "contracts"
// Pending hero assignments per contract
let pendingContractAssignments = {};

function initGame() {
  document.addEventListener("dragover", (e) => {
    const scrollable = document.querySelector("#contracts-tab-content");
    if (!scrollable) return;
    const rect = scrollable.getBoundingClientRect();
    const edgeSize = 100;
    const speed = 8;
    if (e.clientY < rect.top + edgeSize) scrollable.scrollTop -= speed;
    else if (e.clientY > rect.bottom - edgeSize) scrollable.scrollTop += speed;
  });

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

  renderDungeonsTab();

  document
    .getElementById("tab-dungeons")
    .addEventListener("click", () => switchTab("dungeons"));
  document
    .getElementById("tab-contracts")
    .addEventListener("click", () => switchTab("contracts"));

  recruitBtn.addEventListener("click", showShopScreen);
  embarkBtn.addEventListener("click", startMission);
  continueBtn.addEventListener("click", returnToGuild);
  backToGuildBtn.addEventListener("click", hideShopScreen);
  restBtn.addEventListener("click", restHeroes);
  saveBtn.addEventListener("click", saveGame);
  loadBtn.addEventListener("click", loadGame);
  resetBtn.addEventListener("click", resetGame);

  document
    .getElementById("refresh-shop-btn")
    .addEventListener("click", refreshShop);

  headerButtonsContainer = document.createElement("div");
  headerButtonsContainer.style.display = "flex";
  headerButtonsContainer.style.gap = "10px";
  headerButtonsContainer.append(saveBtn, loadBtn, resetBtn);
  document.querySelector(".header").appendChild(headerButtonsContainer);

  showHeaderButtons();

  heroRoster.addEventListener("dragover", () =>
    heroRoster.classList.add("dragover"),
  );
  heroRoster.addEventListener("dragleave", () =>
    heroRoster.classList.remove("dragover"),
  );
  heroRoster.addEventListener("drop", () =>
    heroRoster.classList.remove("dragover"),
  );

  closeHeroStatsBtn.addEventListener("click", () => {
    heroStatsPanel.style.display = "none";
    modalOverlay.style.display = "none";
    heroStatsPanel.classList.remove("visible");
    gameState.selectedHero = null;
  });

  updateUI();
}

function showHeaderButtons() {
  if (!headerButtonsContainer) {
    console.error(
      "headerButtonsContainer is null or undefined, attempting to recreate...",
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
        `Button ${index} not found in headerButtonsContainer, recreating...`,
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

function hideHeaderButtons() {
  if (headerButtonsContainer) {
    headerButtons.forEach((btn) => {
      if (btn && headerButtonsContainer.contains(btn)) {
        btn.style.display = "none";
      }
    });
  }
}

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
        `${hero.name} rests, recovering ${heal} HP. (HP: ${hero.hp}/${hero.maxHp})`,
      );
    });
    resolveContracts();
    toggleCycle();
    updateUI();
  } else {
    alert(`Not enough gold! Need ${cost} (${gameState.gold} available).`);
  }
}

function renderHeroRoster() {
  heroRoster.innerHTML = "";
  gameState.heroes.forEach((hero) => {
    const isPendingContract = Object.values(pendingContractAssignments).some(
      (ids) => ids.includes(hero.id),
    );
    if (
      !isHeroInFormation(hero) &&
      !isHeroOnContract(hero.id) &&
      !isPendingContract
    ) {
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
        Tier ${hero.tier}
        Lv ${hero.level}
      `.trim();
      el.innerHTML = `
        <div class="shape"></div>
        <div class="hero-info">${hero.name.split(" ")[0]}</div>
        <div class="level">Lv${hero.level}</div>
        <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.floor(
          hpPercentage * 100,
        )}%;"></div></div>
      `;
      el.addEventListener("dragstart", (e) =>
        e.dataTransfer.setData("text/plain", hero.id),
      );
      el.addEventListener("click", () => selectHero(hero.id));

      updateHeroTooltipListeners(el);

      heroRoster.appendChild(el);
    }
  });
}

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

function handleFormationSlotClick(index) {
  const current = gameState.formation[index];
  if (current && !gameState.selectedHero) {
    gameState.formation[index] = null;
  } else if (gameState.selectedHero && !current) {
    gameState.formation[index] = gameState.selectedHero;
    gameState.selectedHero = null;
  } else if (gameState.selectedHero && current) {
    const slot = gameState.formation.findIndex(
      (id) => id === gameState.selectedHero,
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
          Tier ${hero.tier}
          Lv ${hero.level}
        `.trim();
        el.innerHTML = `
          <div class="shape"></div>
          <div class="hero-info">${hero.name.split(" ")[0]}</div>
          <div class="level">Lv${hero.level}</div>
          <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width: ${Math.floor(
            hpPercentage * 100,
          )}%;"></div></div>
        `;
        el.addEventListener("dragstart", (e) =>
          e.dataTransfer.setData("text/plain", hero.id),
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

const SHOP_REFRESH_COST = 50;

function renderShop() {
  const recruitList = document.getElementById("recruit-list");
  if (!recruitList) {
    console.error("recruit-list not found in DOM!");
    return;
  }
  recruitList.innerHTML = "";

  // Only generate new heroes if the pool is empty
  if (gameState.shopHeroes.length === 0) {
    for (let i = 0; i < 6; i++) {
      gameState.shopHeroes.push(generateHero());
    }
  }

  gameState.shopHeroes.forEach((hero) => {
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
  });

  setTimeout(() => {
    document
      .querySelectorAll(".recruit-hero")
      .forEach((h) => h.classList.add("visible"));
  }, 10);

  updateRefreshButton();
}

function updateRefreshButton() {
  const btn = document.getElementById("refresh-shop-btn");
  if (btn) {
    btn.textContent = `Refresh Shop (${SHOP_REFRESH_COST}g)`;
    btn.disabled = gameState.gold < SHOP_REFRESH_COST;
  }
}

function refreshShop() {
  if (gameState.gold < SHOP_REFRESH_COST) {
    alert(`Not enough gold! Need ${SHOP_REFRESH_COST}g to refresh.`);
    return;
  }
  gameState.gold -= SHOP_REFRESH_COST;
  gameState.shopHeroes = [];
  renderShop();
  updateUI();
}

function recruitHero(hero, element) {
  if (gameState.gold >= hero.cost) {
    gameState.gold -= hero.cost;
    addHero(hero);
    gameState.shopHeroes = gameState.shopHeroes.filter((h) => h.id !== hero.id);
    element.remove();
    updateUI();
    updateRefreshButton();
  } else {
    alert("Not enough gold!");
  }
}

function hideShopScreen() {
  shopScreen.style.display = "none";
  mainScreen.style.display = "block";
}

function returnToGuild() {
  retreatRequested = false;
  gameState.retreated = false;
  gameState.retreatRoomsCleared = 0;

  resolveContracts();

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
      headerButtonsContainer.remove();
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
      hero.class,
    )}</div>
    <div class="hero-stat-item"><strong>Tier:</strong> ${hero.tier}</div>
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
      hero.hitChance * 100,
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

  const refund = Math.floor(hero.cost * 0.3) + (hero.level - 1) * 10;
  const inFormation = isHeroInFormation(hero);

  const dismissContainer = document.createElement("div");
  dismissContainer.className = "dismiss-container";

  const dismissBtn = document.createElement("button");
  dismissBtn.className = "dismiss-btn";
  dismissBtn.textContent = `Dismiss (${refund}g)`;
  dismissBtn.disabled = inFormation;
  dismissBtn.title = inFormation
    ? "Remove from formation first"
    : `Receive ${refund} gold`;

  const confirmRow = document.createElement("div");
  confirmRow.className = "dismiss-confirm-row";
  confirmRow.style.display = "none";
  confirmRow.innerHTML = `
    <span style="font-size:0.85rem; color:#ccc;">Dismiss ${hero.name.split(" ")[0]} for ${refund}g?</span>
    <div style="display:flex; gap:8px; margin-top:6px;">
        <button class="dismiss-confirm-yes">Yes, Dismiss</button>
        <button class="dismiss-confirm-no">Cancel</button>
    </div>
`;

  dismissBtn.addEventListener("click", () => {
    dismissBtn.style.display = "none";
    confirmRow.style.display = "block";
  });

  confirmRow
    .querySelector(".dismiss-confirm-yes")
    .addEventListener("click", () => {
      dismissHero(hero.id);
      heroStatsPanel.style.display = "none";
      modalOverlay.style.display = "none";
      heroStatsPanel.classList.remove("visible");
    });

  confirmRow
    .querySelector(".dismiss-confirm-no")
    .addEventListener("click", () => {
      confirmRow.style.display = "none";
      dismissBtn.style.display = "block";
    });

  dismissContainer.appendChild(dismissBtn);
  dismissContainer.appendChild(confirmRow);
  heroStatsContent.appendChild(dismissContainer);
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById("dungeons-tab-content").style.display =
    tab === "dungeons" ? "block" : "none";
  document.getElementById("contracts-tab-content").style.display =
    tab === "contracts" ? "block" : "none";
  document
    .getElementById("tab-dungeons")
    .classList.toggle("active", tab === "dungeons");
  document
    .getElementById("tab-contracts")
    .classList.toggle("active", tab === "contracts");
  embarkBtn.style.display = tab === "dungeons" ? "inline-block" : "none";

  if (tab === "contracts") renderContractsTab();
}

function renderDungeonsTab() {
  const dungeonList = document.getElementById("dungeon-list");
  dungeonList.innerHTML = "";
  dungeons.forEach((dungeon) => {
    const el = document.createElement("div");
    el.className = "dungeon";
    el.innerHTML = `
            <div><strong>${dungeon.name}</strong> ${dungeon.difficulty}</div>
            ${dungeon.description}
            <div><div>Reward ${dungeon.reward} Gold</div></div>
        `;
    el.addEventListener("click", () => selectDungeon(dungeon));
    dungeonList.appendChild(el);
  });
}

function renderContractsTab() {
  resolveContracts();
  const list = document.getElementById("contracts-list");
  list.innerHTML = "";

  // --- COMPLETED ---
  const completed = gameState.activeContracts.filter(
    (c) => c.status === "completed",
  );
  if (completed.length) {
    const title = document.createElement("h3");
    title.className = "section-title";
    title.textContent = "⚑ Ready to Claim";
    list.appendChild(title);
    completed.forEach((contract) => renderCompletedContract(contract, list));
  }

  // --- FAILED ---
  const failed = gameState.activeContracts.filter((c) => c.status === "failed");
  if (failed.length) {
    const title = document.createElement("h3");
    title.className = "section-title";
    title.textContent = "✘ Failed";
    list.appendChild(title);
    failed.forEach((contract) => renderFailedContract(contract, list));
  }

  // --- IN PROGRESS ---
  const active = gameState.activeContracts.filter((c) => c.status === "active");
  if (active.length) {
    const title = document.createElement("h3");
    title.className = "section-title";
    title.textContent = "⧗ In Progress";
    list.appendChild(title);
    active.forEach((contract) => renderActiveContract(contract, list));
  }

  // --- AVAILABLE ---
  const availTitle = document.createElement("h3");
  availTitle.className = "section-title";
  availTitle.textContent = "Available Contracts";
  list.appendChild(availTitle);

  contractTemplates.forEach((template) => {
    const alreadyActive = gameState.activeContracts.some(
      (c) => c.contractId === template.id && c.status === "active",
    );
    if (!pendingContractAssignments[template.id]) {
      pendingContractAssignments[template.id] = [];
    }
    renderAvailableContract(template, alreadyActive, list);
  });
}

function renderCompletedContract(contract, list) {
  const template = contractTemplates.find((t) => t.id === contract.contractId);
  if (!template) return;
  const heroNames = contract.assignedHeroes
    .map(
      (id) =>
        gameState.heroes.find((h) => h.id === id)?.name.split(" ")[0] || "?",
    )
    .join(", ");
  const el = document.createElement("div");
  el.className = "contract-card contract-completed";
  el.innerHTML = `
        <div class="contract-name">✔ ${template.name}</div>
        <div class="contract-desc">${heroNames} returned successfully.</div>
        <div class="contract-meta">
            <span>+${template.reward.gold}g</span>
            <span>+${template.reward.xp} XP each</span>
        </div>
    `;
  const btn = document.createElement("button");
  btn.className = "contract-btn claim-btn";
  btn.textContent = `Claim +${template.reward.gold}g`;
  btn.addEventListener("click", () => {
    claimContract(contract.contractId);
    renderContractsTab();
  });
  el.appendChild(btn);
  list.appendChild(el);
}

function renderFailedContract(contract, list) {
  const template = contractTemplates.find((t) => t.id === contract.contractId);
  if (!template) return;
  const heroNames = contract.assignedHeroes
    .map(
      (id) =>
        gameState.heroes.find((h) => h.id === id)?.name.split(" ")[0] || "?",
    )
    .join(", ");
  const el = document.createElement("div");
  el.className = "contract-card contract-failed";
  el.innerHTML = `
        <div class="contract-name">✘ ${template.name}</div>
        <div class="contract-desc">${heroNames} returned empty-handed.</div>
        <div class="contract-meta"><span>No reward</span></div>
    `;
  const btn = document.createElement("button");
  btn.className = "contract-btn dismiss-contract-btn";
  btn.textContent = "Dismiss";
  btn.addEventListener("click", () => {
    dismissContract(contract.contractId);
    renderContractsTab();
  });
  el.appendChild(btn);
  list.appendChild(el);
}

function renderActiveContract(contract, list) {
  const template = contractTemplates.find((t) => t.id === contract.contractId);
  if (!template) return;
  const heroNames = contract.assignedHeroes
    .map(
      (id) =>
        gameState.heroes.find((h) => h.id === id)?.name.split(" ")[0] || "?",
    )
    .join(", ");
  const el = document.createElement("div");
  el.className = "contract-card active-contract";
  el.innerHTML = `
        <div class="contract-name">${template.name}</div>
        <div class="contract-desc">Heroes out: ${heroNames}</div>
        <div class="contract-meta">
            <span>Due: Day ${contract.completesOnDay} (${contract.completesOnCycle})</span>
        </div>
    `;
  list.appendChild(el);
}

function renderAvailableContract(template, alreadyActive, list) {
  const pending = pendingContractAssignments[template.id] || [];
  const chance = getContractSuccessChance(
    pending,
    template.preferredClasses,
    template.difficulty,
  );
  const chanceText = pending.length ? `${Math.round(chance * 100)}%` : "—";

  const card = document.createElement("div");
  card.className = `contract-card${alreadyActive ? " dimmed" : ""}`;
  card.dataset.contractId = template.id;
  card.innerHTML = `
        <div class="contract-name">${template.name}</div>
        <div class="contract-desc">${template.description}</div>
        <div class="contract-meta">
            <span>⧗ ${template.duration.days}d ${template.duration.cycles > 0 ? template.duration.cycles + "c" : ""}</span>
            <span>Fee: ${template.fee}g</span>
            <span>Difficulty: ${template.difficulty}</span>
            <span>Reward: ${template.reward.gold}g +${template.reward.xp}XP</span>
            <span>Preferred: ${template.preferredClasses.map(capitalize).join(", ")}</span>
            <span class="chance-label" id="chance-${template.id}">Success: ${chanceText}</span>
        </div>
        <div class="contract-slots" id="slots-${template.id}"></div>
    `;

  // Build drop slots
  const slotsContainer = card.querySelector(`#slots-${template.id}`);
  for (let i = 0; i < template.slots; i++) {
    const slot = document.createElement("div");
    slot.className = "contract-slot";
    slot.dataset.contractId = template.id;
    slot.dataset.slotIndex = i;

    const assignedHeroId = pending[i];
    if (assignedHeroId) {
      const hero = gameState.heroes.find((h) => h.id === assignedHeroId);
      if (hero) {
        slot.classList.add("occupied");
        const heroEl = buildContractHeroEl(hero, template.id, i);
        slot.appendChild(heroEl);
      }
    } else {
      const slotLabel = document.createElement("span");
      slotLabel.className = "slot-label";
      slotLabel.textContent = "+ Hero";
      slot.appendChild(slotLabel);
    }

    if (!alreadyActive) {
      slot.addEventListener("dragover", (e) => {
        e.preventDefault();
        slot.classList.add("dragover");
      });
      slot.addEventListener("dragleave", () =>
        slot.classList.remove("dragover"),
      );
      slot.addEventListener("drop", (e) =>
        handleContractDrop(e, template.id, i),
      );
    }
    slotsContainer.appendChild(slot);
  }

  // Accept button
  if (!alreadyActive) {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "contract-btn";
    acceptBtn.textContent = pending.length
      ? `Accept${template.fee > 0 ? ` (${template.fee}g fee)` : ""}`
      : "Assign heroes first";
    acceptBtn.disabled = !pending.length;
    acceptBtn.addEventListener("click", () => {
      const assigned = pendingContractAssignments[template.id] || [];
      if (!assigned.length) return;
      assignContract(template.id, assigned);
      pendingContractAssignments[template.id] = [];
      renderContractsTab();
      renderHeroRoster();
    });
    card.appendChild(acceptBtn);
  }

  list.appendChild(card);
}

function buildContractHeroEl(hero, contractId, slotIndex) {
  const hpPercentage = hero.hp / hero.maxHp;
  const hpClass =
    hpPercentage < 0.25 ? "red" : hpPercentage <= 0.6 ? "yellow" : "green";
  const el = document.createElement("div");
  el.className = `hero-base hero ${hero.class}`;
  el.style.width = "4rem";
  el.style.height = "4rem";
  el.style.cursor = "pointer";
  el.title = `Click to remove ${hero.name.split(" ")[0]}`;
  el.innerHTML = `
        <div class="shape"></div>
        <div class="hero-info">${hero.name.split(" ")[0]}</div>
        <div class="level">Lv${hero.level}</div>
        <div class="hp-bar"><div class="hp-fill ${hpClass}" style="width:${Math.floor(hpPercentage * 100)}%;"></div></div>
    `;
  // Click to remove from slot
  el.addEventListener("click", () => {
    pendingContractAssignments[contractId].splice(slotIndex, 1);
    renderContractsTab();
    renderHeroRoster();
  });
  return el;
}

function handleContractDrop(e, contractId, slotIndex) {
  e.preventDefault();
  const slot = e.currentTarget;
  slot.classList.remove("dragover");

  const heroId = e.dataTransfer.getData("text/plain");
  const hero = gameState.heroes.find((h) => h.id === heroId);
  if (!hero) return;

  if (isHeroOnContract(heroId)) return;

  if (isHeroInFormation(hero)) {
    const formationIndex = gameState.formation.indexOf(heroId);
    if (formationIndex !== -1) gameState.formation[formationIndex] = null;
  }

  const pending = pendingContractAssignments[contractId] || [];
  const template = contractTemplates.find((t) => t.id === contractId);

  if (pending.includes(heroId)) return;
  const busyElsewhere = Object.entries(pendingContractAssignments).some(
    ([id, heroes]) => id !== contractId && heroes.includes(heroId),
  );
  if (busyElsewhere) return;
  if (pending.length >= template.slots) return;

  pending[slotIndex] = heroId;
  pendingContractAssignments[contractId] = pending.filter(Boolean);

  renderContractsTab();
  renderHeroRoster();
  updateFormationGrid();
  checkEmbarkButton();
}
