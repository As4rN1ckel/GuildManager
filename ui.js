const heroRoster = document.getElementById('hero-roster');
const formationGrid = document.getElementById('formation-grid');
const dungeonList = document.getElementById('dungeon-list');
const recruitBtn = document.getElementById('recruit-btn');
const embarkBtn = document.getElementById('embark-btn');
const continueBtn = document.getElementById('continue-btn');
const backToGuildBtn = document.getElementById('back-to-guild-btn');
const goldAmount = document.getElementById('gold-amount');
const dayCount = document.getElementById('day-count');
const mainScreen = document.getElementById('main-screen');
const battleScreen = document.getElementById('battle-screen');
const resultsScreen = document.getElementById('results-screen');
const shopScreen = document.getElementById('shop-screen');
const heroStatsPanel = document.getElementById('hero-stats-panel');
const heroStatsContent = document.getElementById('hero-stats-content');

const saveBtn = document.createElement('button');
saveBtn.textContent = 'SAVE';
saveBtn.className = 'primary';

const loadBtn = document.createElement('button');
loadBtn.textContent = 'LOAD';
loadBtn.className = 'primary';

const resetBtn = document.createElement('button');
resetBtn.textContent = 'RESET';
resetBtn.className = 'primary';

const restBtn = document.getElementById('rest-btn');
const restCostAmount = document.getElementById('rest-cost-amount');

function initGame() {
    speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
  
    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'formation-slot';
      slot.dataset.index = i;
      slot.addEventListener('dragover', (e) => e.preventDefault());
      slot.addEventListener('drop', (e) => handleDrop(e, i));
      formationGrid.appendChild(slot);
    }
  
    // Make heroRoster a drop zone
    heroRoster.addEventListener('dragover', (e) => e.preventDefault());
    heroRoster.addEventListener('drop', (e) => handleDrop(e, null));
  
    dungeons.forEach(dungeon => {
      const dungeonEl = document.createElement('div');
      dungeonEl.className = 'dungeon';
      dungeonEl.innerHTML = `
        <div><strong>${dungeon.name}</strong> (${dungeon.difficulty})<div>${dungeon.description}</div></div>
        <div>Reward: ${dungeon.reward} Gold</div>
      `;
      dungeonEl.addEventListener('click', () => selectDungeon(dungeon));
      dungeonList.appendChild(dungeonEl);
    });
  
    recruitBtn.addEventListener('click', showShopScreen);
    embarkBtn.addEventListener('click', startMission);
    speedBtn.addEventListener('click', toggleBattleSpeed);
    continueBtn.addEventListener('click', returnToGuild);
    backToGuildBtn.addEventListener('click', hideShopScreen);
  
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '10px';
    headerButtons.appendChild(saveBtn);
    headerButtons.appendChild(loadBtn);
    headerButtons.appendChild(resetBtn);
    document.querySelector('.header').appendChild(headerButtons);
  
    if (restBtn) {
      restBtn.addEventListener('click', restHeroes);
    }
  
    saveBtn.addEventListener('click', saveGame);
    loadBtn.addEventListener('click', loadGame);
    resetBtn.addEventListener('click', resetGame);

    heroRoster.addEventListener('dragover', () => heroRoster.classList.add('dragover'));
    heroRoster.addEventListener('dragleave', () => heroRoster.classList.remove('dragover'));
    heroRoster.addEventListener('drop', () => heroRoster.classList.remove('dragover'));
  
    updateUI();
  }

function updateUI() {
    goldAmount.textContent = gameState.gold;
    dayCount.textContent = `${gameState.cycle === 'day' ? 'Day' : 'Night'} ${gameState.day}`;
    renderHeroRoster();
    updateFormationGrid();
    
    const injuredHeroes = gameState.heroes.filter(hero => hero.hp < hero.maxHp);
    const cost = injuredHeroes.length * 20;
    restCostAmount.textContent = cost;
    restBtn.disabled = injuredHeroes.length === 0 || gameState.gold < cost;
}

function returnToGuild() {
    resultsScreen.style.display = 'none';
    mainScreen.style.display = 'block';
    toggleCycle();
    gameState.selectedDungeon = null;
    updateFormationGrid();
    renderHeroRoster();
    updateUI();
}

function restHeroes() {
    const injuredHeroes = gameState.heroes.filter(hero => hero.hp < hero.maxHp);
    const cost = injuredHeroes.length * 20;
    
    if (gameState.gold >= cost) {
        gameState.gold -= cost;
        injuredHeroes.forEach(hero => {
            const healAmount = Math.floor(hero.maxHp * 0.5);
            hero.hp = Math.min(hero.maxHp, hero.hp + healAmount);
            addLogEntry('heal', `${hero.name} rests and recovers ${healAmount} HP. (HP: ${hero.hp}/${hero.maxHp})`);
        });
        toggleCycle();
        updateUI();
    } else {
        alert(`Not enough gold! Need ${cost} gold to rest (${gameState.gold} available).`);
    }
}

function renderHeroRoster() {
    heroRoster.innerHTML = '';
    gameState.heroes.forEach(hero => {
        if (!isHeroInFormation(hero)) {
            const heroEl = document.createElement('div');
            heroEl.className = `hero-base hero ${hero.class}${gameState.selectedHero === hero.id ? ' selected' : ''}`;
            heroEl.dataset.id = hero.id;
            heroEl.draggable = true;
            heroEl.innerHTML = `
                <div class="shape"></div>
                <div class="hero-info">${hero.name.split(' ')[0]}</div>
                <div class="level">Lv${hero.level}</div>
                <div class="hp-bar">
                    <div class="hp-fill${hero.hp / hero.maxHp <= 0.3 ? ' low' : ''}" style="width: ${Math.floor((hero.hp / hero.maxHp) * 100)}%;"></div>
                </div>
                <div class="xp-info">XP: ${hero.xp}/${xpThresholds[hero.level]}</div>
            `;
            heroEl.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', hero.id));
            heroEl.addEventListener('click', () => selectHero(hero.id));
            heroRoster.appendChild(heroEl);
        }
    });
}
  

function selectHero(heroId) {
    gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
    renderHeroRoster();
    updateFormationGrid();
    checkEmbarkButton();
}

function handleFormationSlotClick(index) {
    const currentHeroId = gameState.formation[index];
    if (currentHeroId && !gameState.selectedHero) {
        gameState.formation[index] = null;
    } else if (gameState.selectedHero && !currentHeroId) {
        gameState.formation[index] = gameState.selectedHero;
        gameState.selectedHero = null;
    } else if (gameState.selectedHero && currentHeroId) {
        const slotWithSelected = gameState.formation.findIndex(id => id === gameState.selectedHero);
        if (slotWithSelected !== -1) gameState.formation[slotWithSelected] = currentHeroId;
        gameState.formation[index] = gameState.selectedHero;
        gameState.selectedHero = null;
    }
    renderHeroRoster();
    updateFormationGrid();
    checkEmbarkButton();
}

function updateFormationGrid() {
    const slots = formationGrid.querySelectorAll('.formation-slot');
    slots.forEach((slot, index) => {
      const heroId = gameState.formation[index];
      slot.innerHTML = '';
      slot.classList.toggle('occupied', !!heroId);
      if (heroId) {
        const hero = gameState.heroes.find(h => h.id === heroId);
        if (hero) {
          const heroEl = document.createElement('div');
          heroEl.className = `hero ${hero.class}`;
          heroEl.dataset.id = hero.id;
          heroEl.draggable = true;
          heroEl.innerHTML = `
            <div class="shape"></div>
            <div class="hero-info">${hero.name.split(' ')[0]}</div>
            <div class="level">Lv${hero.level}</div>
            <div class="hp-bar">
              <div class="hp-fill${hero.hp / hero.maxHp <= 0.3 ? ' low' : ''}" style="width: ${Math.floor((hero.hp / hero.maxHp) * 100)}%;"></div>
            </div>
          `;
          heroEl.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', hero.id));
          heroEl.addEventListener('click', () => selectHero(hero.id));
          slot.appendChild(heroEl);
        }
      }
    });
  }

  function handleDrop(e, targetIndex) {
    e.preventDefault();
    const heroId = e.dataTransfer.getData('text/plain');
    const hero = gameState.heroes.find(h => h.id === heroId);
    if (!hero) return;
  
    const sourceIndex = gameState.formation.indexOf(heroId);
    const targetHeroId = targetIndex !== null ? gameState.formation[targetIndex] : null;
  
    if (targetIndex === null) {
      // Dropped on heroRoster: Remove from formation
      if (sourceIndex !== -1) {
        gameState.formation[sourceIndex] = null;
      }
      // Do nothing if dragged from roster to roster
    } else if (sourceIndex === -1 && !targetHeroId) {
      // Dragging from roster to empty slot
      gameState.formation[targetIndex] = heroId;
    } else if (sourceIndex !== -1 && !targetHeroId) {
      // Dragging from grid to empty slot
      gameState.formation[sourceIndex] = null;
      gameState.formation[targetIndex] = heroId;
    } else if (sourceIndex !== -1 && targetHeroId) {
      // Swapping within grid
      gameState.formation[sourceIndex] = targetHeroId;
      gameState.formation[targetIndex] = heroId;
    } else if (sourceIndex === -1 && targetHeroId) {
      // Dragging from roster to occupied slot (swap with roster)
      gameState.formation[targetIndex] = heroId;
    }
  
    gameState.selectedHero = null; // Clear selection after drop
    renderHeroRoster();
    updateFormationGrid();
    checkEmbarkButton();
  }

function selectDungeon(dungeon) {
    gameState.selectedDungeon = dungeon;
    dungeonList.querySelectorAll('.dungeon').forEach(el => el.classList.remove('selected'));
    dungeonList.children[dungeons.indexOf(dungeon)].classList.add('selected');
    checkEmbarkButton();
}

function checkEmbarkButton() {
    embarkBtn.disabled = !(gameState.formation.some(slot => slot !== null) && gameState.selectedDungeon);
}

function showShopScreen() {
    mainScreen.style.display = 'none';
    shopScreen.style.display = 'flex';
    renderShop();
}

function renderShop() {
    const recruitList = document.getElementById('recruit-list');
    recruitList.innerHTML = '';
    for (let i = 0; i < 4; i++) {
        const recruit = generateHero();
        const recruitEl = document.createElement('div');
        recruitEl.className = `hero-base recruit-hero ${recruit.class}`;
        recruitEl.innerHTML = `
            <div class="shape"></div>
            <div class="hero-info">${recruit.name}</div>
            <div class="class-info">Class: ${capitalize(recruit.class)}</div>
            <div class="stats">HP: ${recruit.hp} | ATK: ${recruit.attack}</div>
            <div class="cost">${recruit.cost} Gold</div>
        `;
        recruitEl.addEventListener('click', () => recruitHero(recruit, recruitEl));
        recruitList.appendChild(recruitEl);
    }
}

function recruitHero(recruit, element) {
    if (gameState.gold >= recruit.cost) {
        gameState.gold -= recruit.cost;
        addHero(recruit);
        element.remove();
        updateUI();
    } else {
        alert('Not enough gold!');
    }
}

function hideShopScreen() {
    shopScreen.style.display = 'none';
    mainScreen.style.display = 'block';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function selectHero(heroId) {
    gameState.selectedHero = gameState.selectedHero === heroId ? null : heroId;
    renderHeroRoster();
    updateFormationGrid();
    updateHeroStatsPanel(); // Update stats panel
    checkEmbarkButton();
  }
  
  function updateHeroStatsPanel() {
    if (!gameState.selectedHero) {
      heroStatsPanel.style.display = 'none';
      return;
    }
    const hero = gameState.heroes.find(h => h.id === gameState.selectedHero);
    if (hero) {
      heroStatsPanel.style.display = 'block';
      heroStatsContent.innerHTML = `
        <p><strong>Name:</strong> ${hero.name}</p>
        <p><strong>Class:</strong> ${capitalize(hero.class)}</p>
        <p><strong>HP:</strong> ${hero.hp}/${hero.maxHp}</p>
        <p><strong>Attack:</strong> ${hero.attack}</p>
        <p><strong>XP:</strong> ${hero.xp}/${xpThresholds[hero.level]}</p>
        <p><strong>Special:</strong> ${hero.special}</p>
        <p><strong>Passive:</strong> ${hero.passive}</p>
        <p><strong>Level:</strong> ${hero.level}</p>
      `;
    }
  }