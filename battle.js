// Battle simulation logic
const battleLog = document.getElementById("battle-log");
const battleProgress = document.getElementById("battle-progress");
const dungeonName = document.getElementById("dungeon-name");
const resultTitle = document.getElementById("result-title");
const casualtiesList = document.getElementById("casualties-list");
const rewardsList = document.getElementById("rewards-list");
const speedBtn = document.getElementById("speed-btn");
const exitBtn = document.getElementById("exit-btn");
const heroStatsList = document.getElementById("hero-stats-list");
const enemyStatsList = document.getElementById("enemy-stats-list");

// Battle Manager Component
class BattleManager {
  static async start(dungeon, totalRooms) {
    let currentRoom = 0;
    gameState.casualties = [];

    const roomEnemies = this.generateRooms(dungeon, totalRooms);
    this.logEntry("system", `Your party enters ${dungeon.name}...`);

    while (currentRoom < totalRooms) {
      currentRoom++;
      this.updateProgress(currentRoom, totalRooms);
      const formationHeroes = this.getFormationHeroes();
      if (!formationHeroes.length) {
        this.handleDefeat(formationHeroes, roomEnemies, currentRoom, totalRooms, dungeon);
        return;
      }

      const roomCleared = await this.simulateRoom(currentRoom, totalRooms, formationHeroes, roomEnemies[currentRoom - 1], dungeon);
      this.updateStats(formationHeroes, roomEnemies[currentRoom - 1], currentRoom, totalRooms);

      if (!roomCleared) {
        currentRoom--; // Repeat room if enemies remain
        this.updateProgress(currentRoom + 0.5, totalRooms);
      }
    }

    this.logEntry("system", "All rooms cleared! The dungeon is conquered. Press Exit to review the results.");
    exitBtn.disabled = false;
  }

  static generateRooms(dungeon, totalRooms) {
    return Array(totalRooms)
      .fill(null)
      .map((_, i) => {
        const isBossRoom = i === totalRooms - 1;
        return generateEnemyGroup(dungeon, i, isBossRoom);
      });
  }

  static getFormationHeroes() {
    return gameState.formation
      .filter((id) => id !== null)
      .map((id) => gameState.heroes.find((h) => h.id === id))
      .filter((hero) => hero && !gameState.casualties.includes(hero.id));
  }

  static async simulateRoom(roomNumber, totalRooms, formationHeroes, enemyGroup, dungeon) {
    if (!enemyGroup || !formationHeroes.length) {
      this.logEntry("system", "Error: No enemies or heroes to fight!");
      return false;
    }

    const isBossRoom = roomNumber === totalRooms;
    this.logEntry(
      "system",
      `Your party enters Room ${roomNumber} ${
        isBossRoom ? "and faces the boss" : ""
      }: ${enemyGroup.map((e) => e.type).join(", ")} (${enemyGroup
        .map((e) => `${e.hp}/${e.maxHp}`)
        .join(", ")} HP)!`
    );

    return await this.runBattleLoop(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon);
  }

  static async runBattleLoop(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon) {
    let allEnemiesDefeated = false;
    while (!allEnemiesDefeated && formationHeroes.length > 0) {
      await HeroActions.performTurns(formationHeroes, enemyGroup, roomNumber, totalRooms);
      allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);
      if (!allEnemiesDefeated) {
        await EnemyActions.performTurns(formationHeroes, enemyGroup, roomNumber, totalRooms);
        allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);
      }
      if (allEnemiesDefeated) {
        this.handleRoomClear(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon);
        return true;
      }
    }
    return false;
  }

  static handleRoomClear(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon) {
    const xpPerEnemy = isBossRoom ? dungeon.bossXP : dungeon.enemyXp;
    const xpGained = Math.round(xpPerEnemy * enemyGroup.length); // Round XP to nearest whole number
    this.logEntry("xp-level", `Heroes gained ${xpGained} XP.`);
    formationHeroes.forEach((hero) => {
      hero.xp = Math.round(hero.xp + xpGained); // Ensure XP is a whole number
      levelUpHero(hero);
    });
  }

  static handleDefeat(formationHeroes, enemyGroup, roomNumber, totalRooms, dungeon) {
    this.logEntry(
      "system",
      "All heroes have fallen! The battle is lost. Press Exit to review the results."
    );
    updateHeroStats(formationHeroes);
    updateEnemyStats(enemyGroup, roomNumber, totalRooms);
    exitBtn.disabled = false;
  }

  static updateProgress(currentRoom, totalRooms) {
    const progress = Math.min(
      100,
      Math.floor((currentRoom / totalRooms) * 100)
    );
    battleProgress.style.width = `${progress}%`;
    document.querySelector(".progress-text").textContent = `${progress}%`;
  }

  static updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms) {
    updateHeroStats(formationHeroes);
    updateEnemyStats(enemyGroup, roomNumber, totalRooms);
  }

  static logEntry(type, text) {
    addLogEntry(type, text);
  }
}

// Hero Actions Component
class HeroActions {
  static async performTurns(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    for (const hero of formationHeroes) {
      await new Promise((resolve) =>
        setTimeout(resolve, 500 / (gameState.battleSpeed || 1))
      );
      await this.performHeroTurn(
        hero,
        formationHeroes,
        enemyGroup,
        roomNumber,
        totalRooms
      );
    }
  }

  static async performHeroTurn(
    hero,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    PassiveEffects.applyPassive(hero, formationHeroes);

    // Calculate effective hit chance with passive
    let effectiveHitChance = hero.hitChance;
    if (hero.class === "archer") {
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (passive && passive.type === "hitChanceBoost") {
        effectiveHitChance = Math.min(1.0, effectiveHitChance + passive.value);
      }
    }

    let damage = Math.round(hero.attack); // Round base attack to whole number
    if (hero.class !== "warrior") {
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (
        passive &&
        passive.type === "damageBoost" &&
        hero.class !== "archer"
      ) {
        damage = Math.round(passive.apply(hero, damage)); // Round damage after passive
      }
    }

    const targetEnemy = enemyGroup.find((e) => e.hp > 0) || null;
    if (targetEnemy && Math.random() < effectiveHitChance) {
      targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
      BattleManager.logEntry(
        "attack",
        `${hero.name} attacks ${targetEnemy.type} for ${damage} damage! (${targetEnemy.type} HP: ${Math.round(targetEnemy.hp)}/${targetEnemy.maxHp})`
      );
    } else if (targetEnemy) {
      BattleManager.logEntry(
        "attack",
        `${hero.name} misses ${targetEnemy.type}!`
      );
    } else {
      BattleManager.logEntry(
        "attack",
        `${hero.name} finds no enemies left to attack!`
      );
    }
    BattleManager.updateStats(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms
    );

    // Special ability (skill) with dynamic chance and cooldown
    if (Math.random() < 0.2 && hero.cooldown === 0) {
      // Special chance remains hardcoded for now
      const skill = heroSkills.find((s) => s.name === hero.special);
      let specialDamage = Math.round(hero.attack * ((skill && skill.value) || 1.0)); // Round special damage base
      if (hero.class !== "warrior") {
        const passive = heroPassives.find((p) => p.name === hero.passive);
        if (
          passive &&
          passive.type === "damageBoost" &&
          hero.class !== "archer"
        ) {
          specialDamage = Math.round(passive.apply(hero, specialDamage)); // Round after passive
        }
      }

      const specialTarget = enemyGroup.find((e) => e.hp > 0) || null;
      if (specialTarget && Math.random() < effectiveHitChance) {
        if (skill.type === "damage") {
          specialDamage = Math.round(skill.apply(hero, specialTarget, specialDamage)); // Round skill damage
          specialTarget.hp = Math.max(0, specialTarget.hp - specialDamage);
          BattleManager.logEntry(
            "special",
            `${hero.name} uses ${hero.special} for ${specialDamage} damage! (${specialTarget.type} HP: ${Math.round(specialTarget.hp)}/${specialTarget.maxHp})`
          );
        } else if (skill.type === "heal") {
          skill.apply(hero, formationHeroes);
          BattleManager.logEntry(
            "heal",
            `${hero.name} uses ${hero.special} to heal allies!`
          );
        }
      } else if (specialTarget) {
        BattleManager.logEntry(
          "special",
          `${hero.name} misses with ${hero.special}!`
        );
      } else {
        BattleManager.logEntry(
          "special",
          `${hero.name} finds no enemies left for ${hero.special}!`
        );
      }
      hero.cooldown = skill.cooldown;
    } else if (hero.cooldown > 0) {
      hero.cooldown--;
    }

    // Cleric-specific healing (special logic)
    if (hero.class === "cleric") {
      const injuredAllies = formationHeroes.filter(
        (ally) => ally.hp < ally.maxHp
      );
      if (injuredAllies.length > 0) {
        const healTarget =
          injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
        const skill = heroSkills.find((s) => s.name === hero.special);
        const healAmount = Math.round(
          hero.attack * ((skill && skill.value) || 1.0)
        ); // Round heal amount
        healTarget.hp = Math.min(healTarget.maxHp, Math.round(healTarget.hp + healAmount)); // Round HP
        BattleManager.logEntry(
          "heal",
          `${hero.name} heals ${healTarget.name} for ${healAmount} HP! (${healTarget.name} HP: ${Math.round(healTarget.hp)}/${healTarget.maxHp})`
        );
      } else {
        BattleManager.logEntry(
          "heal",
          `${hero.name} finds no allies needing healing!`
        );
      }
      BattleManager.updateStats(
        formationHeroes,
        enemyGroup,
        roomNumber,
        totalRooms
      );
    }

    BattleManager.updateStats(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms
    );
  }
}

// Enemy Actions Component
class EnemyActions {
  static async performTurns(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    for (const enemy of enemyGroup) {
      if (enemy.hp > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, 500 / (gameState.battleSpeed || 1))
        );
        await this.performEnemyTurn(
          enemy,
          formationHeroes,
          enemyGroup,
          roomNumber,
          totalRooms
        );
      }
    }
  }

  static async performEnemyTurn(
    enemy,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    const livingHeroes = formationHeroes.filter((h) => h.hp > 0);
    if (!livingHeroes.length) return;

    let targetHeroesInRow = [];
    // Try front row first (indices 0-2)
    targetHeroesInRow = livingHeroes.filter(
      (h) => gameState.formation.indexOf(h.id) < 3 && h.hp > 0
    );
    if (!targetHeroesInRow.length) {
      // Try middle row (indices 3-5)
      targetHeroesInRow = livingHeroes.filter(
        (h) => gameState.formation.indexOf(h.id) < 6 && h.hp > 0
      );
    }
    if (!targetHeroesInRow.length) {
      // Try back row (indices 6-8)
      targetHeroesInRow = livingHeroes.filter((h) => h.hp > 0);
    }

    if (targetHeroesInRow.length > 0) {
      const targetHero =
        targetHeroesInRow[Math.floor(Math.random() * targetHeroesInRow.length)];
      if (Math.random() < enemy.hitChance) {
        let damage = Math.round(enemy.damage); // Round enemy damage
        if (targetHero.class === "warrior") {
          const passive = heroPassives.find(
            (p) => p.name === targetHero.passive
          );
          if (passive && passive.type === "damageReduction") {
            damage = Math.round(passive.apply(targetHero, null, damage)); // Round after reduction
          }
        }
        targetHero.hp = Math.max(0, Math.round(targetHero.hp - damage)); // Round HP after damage
        BattleManager.logEntry(
          "enemy-attack",
          `The ${enemy.type} hits ${targetHero.name} for ${damage} damage! (${targetHero.name} HP: ${Math.round(targetHero.hp)}/${targetHero.maxHp})`
        );
        if (targetHero.hp <= 0) {
          gameState.casualties.push(targetHero.id);
          BattleManager.logEntry(
            "system",
            `${targetHero.name} falls in battle!`
          );
          formationHeroes = formationHeroes.filter(
            (h) => h.id !== targetHero.id
          );
        }
      } else {
        BattleManager.logEntry(
          "enemy-attack",
          `The ${enemy.type} misses ${targetHero.name}!`
        );
      }
    }
    BattleManager.updateStats(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms
    );
  }
}

// Passive Effects Component
class PassiveEffects {
  static applyPassive(hero, formationHeroes) {
    const passive = heroPassives.find(
      (p) => p.name === hero.passive && p.appliesTo.includes(hero.class)
    );
    if (!passive) return;

    switch (passive.type) {
      case "damageReduction":
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${
            passive.name
          } reduces incoming damage by ${Math.floor(
            (1 - passive.value) * 100
          )}%.`
        );
        break;
      case "hitChanceBoost":
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${
            passive.name
          } increases hit chance by ${Math.floor(passive.value * 100)}%.`
        );
        break;
      case "damageBoost":
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${
            passive.name
          } increases damage by ${Math.floor((passive.value - 1) * 100)}%.`
        );
        break;
      case "heal":
        passive.apply(hero, formationHeroes);
        break;
      default:
        break;
    }
  }
}

// UI Updates Component (partial, using existing functions for now)
function updateHeroStats(formationHeroes) {
  heroStatsList.innerHTML = "";
  formationHeroes.forEach((hero) => {
    const heroStat = document.createElement("div");
    heroStat.className = "hero-stat";
    heroStat.innerHTML = `
            <span>${hero.name.split(" ")[0]} (Lv${hero.level})</span>
            <div class="stat-hp-bar">
                <div class="stat-hp-fill${
                  hero.hp / hero.maxHp <= 0.3 ? " low" : ""
                }" style="width: ${Math.floor(
      (hero.hp / hero.maxHp) * 100
    )}%;"></div>
            </div>
            <span>${Math.round(hero.hp)}/${hero.maxHp}</span>  <!-- Round HP -->
        `;
    heroStatsList.appendChild(heroStat);
  });
}

function updateEnemyStats(enemyGroup, roomNumber, totalRooms) {
  enemyStatsList.innerHTML = "";
  if (!enemyGroup || enemyGroup.length === 0) {
    enemyStatsList.innerHTML =
      "<span>No enemies remaining in this room.</span>";
    return;
  }

  const isBossRoom = roomNumber === totalRooms;
  enemyGroup.forEach((enemy) => {
    const enemyStat = document.createElement("div");
    enemyStat.innerHTML = `
        <span>${isBossRoom ? "Boss: " : ""}${enemy.type}</span>
        <div class="stat-hp-bar">
          <div class="stat-hp-fill${
            enemy.hp / enemy.maxHp <= 0.3 ? " low" : ""
          }" style="width: ${Math.floor(
      (enemy.hp / enemy.maxHp) * 100
    )}%;"></div>
        </div>
        <span>${Math.round(enemy.hp)}/${enemy.maxHp}</span>  <!-- Round HP -->
      `;
    enemyStatsList.appendChild(enemyStat);
  });
}

// Main entry point
function startMission() {
  if (!gameState.selectedDungeon) {
    alert("No dungeon selected! Please choose a dungeon first.");
    return;
  }
  if (!gameState.formation.some((id) => id !== null)) {
    alert("No heroes in formation! Assign at least one hero before embarking.");
    return;
  }
  mainScreen.style.display = "none";
  battleScreen.style.display = "flex";
  dungeonName.textContent = gameState.selectedDungeon.name;
  battleLog.innerHTML = "";
  battleProgress.style.width = "0%";
  document.querySelector(".progress-text").textContent = "0%";
  exitBtn.disabled = true;
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
  BattleManager.start(
    gameState.selectedDungeon,
    gameState.selectedDungeon.roomCount
  );
}

function generateEnemyGroup(dungeon, roomNumber, isBossRoom) {
  const {
    enemyCountOnRoom,
    enemies,
    enemyStats,
    bosses,
    bossStats,
    bossCount,
  } = dungeon;
  const enemyCount = isBossRoom
    ? Math.floor(Math.random() * (bossCount.max - bossCount.min + 1)) +
      bossCount.min
    : Math.floor(
        Math.random() * (enemyCountOnRoom.max - enemyCountOnRoom.min + 1)
      ) + enemyCountOnRoom.min;
  const enemyPool = isBossRoom ? bosses : enemies;
  const stats = isBossRoom ? bossStats : enemyStats;

  return Array(enemyCount)
    .fill(null)
    .map(() => ({
      type: enemyPool[Math.floor(Math.random() * enemyPool.length)],
      hp: stats.hp,
      maxHp: stats.hp,
      damage: Math.round(stats.damage), // Round enemy damage to whole number
      hitChance: stats.hitChance,
    }));
}

function addLogEntry(type, text) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  battleLog.appendChild(entry);
  battleLog.scrollTop = battleLog.scrollHeight;
}

function showResults() {
  battleScreen.style.display = "none";
  resultsScreen.style.display = "flex";

  const isVictory = checkVictory();
  resultTitle.textContent = isVictory ? "Victory!" : "Defeat!";
  resultTitle.style.color = isVictory ? "#2ecc71" : "#e74c3c";

  casualtiesList.innerHTML = "";
  gameState.casualties.forEach((id) => {
    const hero = gameState.heroes.find((h) => h.id === id);
    if (hero) {
      const heroEl = document.createElement("div");
      heroEl.className = `hero ${hero.class}`;
      heroEl.innerHTML = `<div class="shape"></div><div class="hero-info">${hero.name}</div>`;
      casualtiesList.appendChild(heroEl);
    }
  });

  rewardsList.innerHTML = "";
  if (isVictory) {
    const goldReward = gameState.selectedDungeon.reward;
    gameState.gold += goldReward;
    rewardsList.innerHTML += `<div class="reward-item">Gold: ${goldReward}</div>`;

    const survivors = gameState.formation
      .filter((id) => id && !gameState.casualties.includes(id))
      .map((id) => gameState.heroes.find((h) => h.id === id));
    rewardsList.innerHTML += `<div class="reward-item">Dungeon Cleared!</div>`;
  }

  gameState.heroes = gameState.heroes.filter(
    (h) => !gameState.casualties.includes(h.id)
  );
  gameState.formation = gameState.formation.map((id) =>
    gameState.casualties.includes(id) ? null : id
  );
}

function toggleBattleSpeed() {
  const speeds = [0.5, 1, 2, 4];
  const currentIndex = speeds.indexOf(gameState.battleSpeed);
  gameState.battleSpeed = speeds[(currentIndex + 1) % speeds.length];
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
}

function returnToGuild() {
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  gameState.day++;
  gameState.selectedDungeon = null;
  updateFormationGrid();
  renderHeroRoster();
  updateUI();
}

exitBtn.addEventListener("click", () => {
  if (!exitBtn.disabled) {
    showResults();
  }
});