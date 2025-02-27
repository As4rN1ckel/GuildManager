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
const staticTooltip = document.getElementById('static-tooltip');
const shopTooltip = document.getElementById('shop-tooltip');

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
    for (let i = 0; i < 9; i++) {
        const slot = document.createElement('div');
        slot.className = 'formation-slot';
        slot.dataset.index = i;
        slot.addEventListener('click', () => handleFormationSlotClick(i));
        formationGrid.appendChild(slot);
    }
    
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
    
    // Add save/load/reset buttons to the header
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '10px';
    headerButtons.appendChild(saveBtn);
    headerButtons.appendChild(loadBtn);
    headerButtons.appendChild(resetBtn);
    document.querySelector('.header').appendChild(headerButtons);
    
    // Ensure restBtn is interactive and add event listener
    if (restBtn) {
        restBtn.addEventListener('click', restHeroes);
    }
    
    // Add event listeners for save/load/reset
    saveBtn.addEventListener('click', saveGame);
    loadBtn.addEventListener('click', loadGame);
    resetBtn.addEventListener('click', resetGame);
    
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
            heroEl.className = `hero ${hero.class}${gameState.selectedHero === hero.id ? ' selected' : ''}`;
            heroEl.dataset.id = hero.id;
            heroEl.innerHTML = `
                <div class="shape"></div>
                <div class="hero-info">${hero.name.split(' ')[0]}</div>
                <div class="level">Lv${hero.level}</div>
                <div class="hp-bar">
                    <div class="hp-fill${hero.hp / hero.maxHp <= 0.3 ? ' low' : ''}" style="width: ${Math.floor((hero.hp / hero.maxHp) * 100)}%;"></div>
                </div>
                <div class="xp-info">XP: ${hero.xp}/${xpThresholds[hero.level]}</div>
            `;
            heroEl.addEventListener('click', () => selectHero(hero.id));
            heroEl.addEventListener('mouseenter', () => showTooltip(hero, staticTooltip));
            heroEl.addEventListener('mouseleave', () => hideTooltip(staticTooltip));
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
                heroEl.innerHTML = `
                    <div class="shape"></div>
                    <div class="hero-info">${hero.name.split(' ')[0]}</div>
                    <div class="level">Lv${hero.level}</div>
                    <div class="hp-bar">
                        <div class="hp-fill${hero.hp / hero.maxHp <= 0.3 ? ' low' : ''}" style="width: ${Math.floor((hero.hp / hero.maxHp) * 100)}%;"></div>
                    </div>
                `;
                heroEl.addEventListener('mouseenter', () => showTooltip(hero, staticTooltip));
                heroEl.addEventListener('mouseleave', () => hideTooltip(staticTooltip));
                slot.appendChild(heroEl);
            }
        }
    });
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
        recruitEl.className = `recruit-hero ${recruit.class}`;
        recruitEl.innerHTML = `
            <div class="shape"></div>
            <div class="hero-info">${recruit.name}</div>
            <div class="class-info">Class: ${capitalize(recruit.class)}</div>
            <div class="stats">HP: ${recruit.hp} | ATK: ${recruit.attack}</div>
            <div class="cost">${recruit.cost} Gold</div>
        `;
        recruitEl.addEventListener('click', () => recruitHero(recruit, recruitEl));
        recruitEl.addEventListener('mouseenter', () => showTooltip(recruit, shopTooltip));
        recruitEl.addEventListener('mouseleave', () => hideTooltip(shopTooltip));
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
    hideTooltip(shopTooltip);
}

function showTooltip(hero, tooltipElement) {
    tooltipElement.style.display = 'block';
    tooltipElement.textContent = `
        Name: ${hero.name}
        Class: ${capitalize(hero.class)}
        HP: ${hero.hp}/${hero.maxHp}
        Attack: ${hero.attack}
        XP: ${hero.xp}/${xpThresholds[hero.level]}
        Special: ${hero.special}
        Passive: ${hero.passive}
        Level: ${hero.level}
    `;
}

function hideTooltip(tooltipElement) {
    tooltipElement.style.display = 'none';
    tooltipElement.textContent = 'Hover over a hero to see stats';
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}