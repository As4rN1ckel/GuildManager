// Battle simulation logic

// DOM elements for battle UI
const battleLog = document.getElementById("battle-log"); // Battle log container
const battleProgress = document.getElementById("battle-progress"); // Progress bar
const dungeonName = document.getElementById("dungeon-name"); // Current dungeon name
const resultTitle = document.getElementById("result-title"); // Mission outcome
const casualtiesList = document.getElementById("casualties-list"); // Fallen heroes list
const rewardsList = document.getElementById("rewards-list"); // Mission rewards
const speedBtn = document.getElementById("speed-btn"); // Battle speed button
const exitBtn = document.getElementById("exit-btn"); // Exit battle button
const heroStatsList = document.getElementById("hero-stats-list"); // Hero stats display
const enemyStatsList = document.getElementById("enemy-stats-list"); // Enemy stats display

/**
 * Manages battle flow, dungeon progression, and combat outcomes.
 * @class
 */
class BattleManager {
  /**
   * Starts a dungeon mission.
   * @param {Object} dungeon - Dungeon data.
   * @param {number} totalRooms - Total dungeon rooms.
   */
  static async start(dungeon, totalRooms) {
    let currentRoom = 0; // Current room counter
    gameState.casualties = []; // Reset casualties

    const roomEnemies = this.generateRooms(dungeon, totalRooms);
    this.logEntry("system", `Your party enters ${dungeon.name}...`);

    while (currentRoom < totalRooms) {
      currentRoom++; // Advance to next room
      this.updateProgress(currentRoom, totalRooms);

      const formationHeroes = this.getFormationHeroes();
      if (!formationHeroes.length) {
        this.handleDefeat(
          formationHeroes,
          roomEnemies[currentRoom - 1],
          currentRoom,
          totalRooms,
          dungeon
        );
        return;
      }

      const roomCleared = await this.simulateRoom(
        currentRoom,
        totalRooms,
        formationHeroes,
        roomEnemies[currentRoom - 1],
        dungeon
      );
      this.updateStats(
        formationHeroes,
        roomEnemies[currentRoom - 1],
        currentRoom,
        totalRooms
      );

      if (!roomCleared) currentRoom--; // Retry if room not cleared
      this.updateProgress(currentRoom + (roomCleared ? 0 : 0.5), totalRooms);
    }

    this.logEntry("system", "Dungeon conquered. Press Exit for results.");
    exitBtn.disabled = false; // Enable exit
  }

  /**
   * Generates enemy groups for dungeon rooms.
   * @param {Object} dungeon - Dungeon configuration.
   * @param {number} totalRooms - Total rooms.
   * @returns {Array<Object>} Enemy groups per room.
   */
  static generateRooms(dungeon, totalRooms) {
    return Array(totalRooms)
      .fill(null)
      .map((_, i) => generateEnemyGroup(dungeon, i, i === totalRooms - 1));
  }

  /**
   * Gets living heroes in formation.
   * @returns {Array<Object>} Array of active heroes.
   */
  static getFormationHeroes() {
    return gameState.formation
      .filter((id) => id !== null)
      .map((id) => gameState.heroes.find((h) => h.id === id))
      .filter((hero) => hero && !gameState.casualties.includes(hero.id));
  }

  /**
   * Simulates combat for a dungeon room.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {Object} dungeon - Dungeon data.
   * @returns {Promise<boolean>} True if room cleared.
   */
  static async simulateRoom(
    roomNumber,
    totalRooms,
    formationHeroes,
    enemyGroup,
    dungeon
  ) {
    if (!enemyGroup || !formationHeroes.length) return false;

    const isBossRoom = roomNumber === totalRooms;
    this.logEntry(
      "system",
      `Room ${roomNumber} ${isBossRoom ? "boss:" : ""} ${enemyGroup
        .map((e) => e.type)
        .join(", ")} (${enemyGroup
        .map((e) => `${e.hp}/${e.maxHp}`)
        .join(", ")} HP)`
    );

    return await this.runBattleLoop(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms,
      isBossRoom,
      dungeon
    );
  }

  /**
   * Runs turn-based combat until victory or defeat.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   * @param {boolean} isBossRoom - If this is the boss room.
   * @param {Object} dungeon - Dungeon data.
   * @returns {Promise<boolean>} True if enemies defeated.
   */
  static async runBattleLoop(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    isBossRoom,
    dungeon
  ) {
    let allEnemiesDefeated = false;

    while (!allEnemiesDefeated && formationHeroes.length > 0) {
      await HeroActions.performTurns(
        formationHeroes,
        enemyGroup,
        roomNumber,
        totalRooms
      );
      formationHeroes = this.getFormationHeroes();
      allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);

      if (allEnemiesDefeated) {
        this.handleRoomClear(
          formationHeroes,
          enemyGroup,
          roomNumber,
          totalRooms,
          isBossRoom,
          dungeon
        );
        return true;
      }

      await EnemyActions.performTurns(
        formationHeroes,
        enemyGroup,
        roomNumber,
        totalRooms
      );
      formationHeroes = this.getFormationHeroes();
      allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);
    }

    if (allEnemiesDefeated) {
      this.handleRoomClear(
        formationHeroes,
        enemyGroup,
        roomNumber,
        totalRooms,
        isBossRoom,
        dungeon
      );
      return true;
    }
    return false;
  }

  /**
   * Handles room clearance, awarding XP to surviving heroes.
   * @param {Array<Object>} formationHeroes - Surviving heroes.
   * @param {Array<Object>} enemyGroup - Defeated enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   * @param {boolean} isBossRoom - If this is the boss room.
   * @param {Object} dungeon - Dungeon data.
   */
  static handleRoomClear(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    isBossRoom,
    dungeon
  ) {
    const xpPerEnemy = isBossRoom ? dungeon.bossXP : dungeon.enemyXp;
    const xpGained = Math.round(xpPerEnemy * enemyGroup.length);
    this.logEntry("xp-level", `Heroes gained ${xpGained} XP.`);

    formationHeroes.forEach((hero) => {
      hero.xp = Math.round(hero.xp + xpGained);
      levelUpHero(hero); // Handle level-ups
    });
  }

  /**
   * Handles defeat when all heroes are defeated.
   * @param {Array<Object>} formationHeroes - Defeated or empty heroes.
   * @param {Array<Object>} enemyGroup - Remaining enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   * @param {Object} dungeon - Dungeon data.
   */
  static handleDefeat(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    dungeon
  ) {
    this.logEntry("system", "All heroes defeated! Press Exit for results.");
    updateHeroStats(formationHeroes);
    updateEnemyStats(enemyGroup, roomNumber, totalRooms);
    exitBtn.disabled = false; // Enable exit
  }

  /**
   * Updates the battle progress bar.
   * @param {number} currentRoom - Current room progress.
   * @param {number} totalRooms - Total rooms.
   */
  static updateProgress(currentRoom, totalRooms) {
    const progress = Math.min(
      100,
      Math.floor((currentRoom / totalRooms) * 100)
    );
    battleProgress.style.width = `${progress}%`;
    document.querySelector(".progress-text").textContent = `${progress}%`;
  }

  /**
   * Updates hero and enemy stats in the UI.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   */
  static updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms) {
    updateHeroStats(formationHeroes);
    updateEnemyStats(enemyGroup, roomNumber, totalRooms);
  }

  /**
   * Adds a log entry to the battle UI.
   * @param {string} type - Log entry type (e.g., "attack", "heal").
   * @param {string} text - Log message.
   */
  static logEntry(type, text) {
    addLogEntry(type, text);
  }
}

/**
 * Manages hero actions during battle.
 * @class
 */
class HeroActions {
  /**
   * Executes turns for all heroes.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   */
  static async performTurns(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    const heroes = [...formationHeroes];
    for (let hero of heroes) {
      if (hero.hp <= 0) continue; // Skip defeated heroes

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

      if (hero.hp <= 0) {
        gameState.casualties.push(hero.id);
        BattleManager.logEntry("system", `${hero.name} falls in battle!`);
      }
    }
  }

  /**
   * Performs a single hero turn, including attacks and specials.
   * @param {Object} hero - The hero acting.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   */
  static async performHeroTurn(
    hero,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    PassiveEffects.applyPassive(hero, formationHeroes);

    let hitChance = hero.hitChance;
    if (hero.class === "archer") {
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (passive?.type === "hitChanceBoost")
        hitChance = Math.min(1.0, hitChance + passive.value);
    }

    let damage = Math.round(hero.attack);
    if (hero.class !== "warrior") {
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (passive?.type === "damageBoost" && hero.class !== "archer")
        damage = Math.round(passive.apply(hero, damage));
    }

    const target = enemyGroup.find((e) => e.hp > 0) || null;
    if (target && Math.random() < hitChance) {
      target.hp = Math.max(0, target.hp - damage);
      BattleManager.logEntry(
        "attack",
        `${hero.name} hits ${target.type} for ${damage} damage! (${
          target.type
        } HP: ${Math.round(target.hp)}/${target.maxHp})`
      );
    } else if (target) {
      BattleManager.logEntry("attack", `${hero.name} misses ${target.type}!`);
    } else {
      BattleManager.logEntry("attack", `${hero.name} finds no enemies!`);
    }
    BattleManager.updateStats(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms
    );

    if (Math.random() < 0.25 && hero.cooldown === 0) {
      const skill = heroSkills.find((s) => s.name === hero.special);
      let specialDamage = Math.round(hero.attack * (skill?.value || 1));
      if (hero.class !== "warrior") {
        const passive = heroPassives.find((p) => p.name === hero.passive);
        if (passive?.type === "damageBoost" && hero.class !== "archer")
          specialDamage = Math.round(passive.apply(hero, specialDamage));
      }

      const targets = enemyGroup.filter((e) => e.hp > 0);
      if (targets.length > 0 && Math.random() < hitChance) {
        if (skill.type === "damage") {
          let finalTargets = targets;
          if (skill.name === "Multi Shot") {
            finalTargets = targets.slice(0, Math.min(3, targets.length));
            const damages = skill.apply(hero, finalTargets, specialDamage);
            finalTargets.forEach((target, i) => {
              const d = damages[i] || 0;
              target.hp = Math.max(0, target.hp - d);
              BattleManager.logEntry(
                "special",
                `${hero.name} uses ${skill.name} for ${d} damage! (${
                  target.type
                } HP: ${Math.round(target.hp)}/${target.maxHp})`
              );
            });
          } else {
            const t = finalTargets[0];
            specialDamage = Math.round(skill.apply(hero, t, specialDamage));
            t.hp = Math.max(0, t.hp - specialDamage);
            BattleManager.logEntry(
              "special",
              `${hero.name} uses ${skill.name} for ${specialDamage} damage! (${
                t.type
              } HP: ${Math.round(t.hp)}/${t.maxHp})`
            );
          }
        } else if (skill.type === "heal") {
          skill.apply(hero, formationHeroes);
          const injured = formationHeroes.filter((h) => h.hp < h.maxHp);
          if (injured.length > 0) {
            const target = injured[Math.floor(Math.random() * injured.length)];
            const heal = Math.round(hero.attack * skill.value);
            BattleManager.logEntry(
              "heal",
              `${hero.name} heals ${target.name} for ${heal} HP! (${
                target.name
              } HP: ${Math.round(target.hp)}/${target.maxHp})`
            );
          }
        }
      } else if (targets.length > 0) {
        BattleManager.logEntry(
          "special",
          `${hero.name} misses with ${hero.special}!`
        );
      } else {
        BattleManager.logEntry(
          "special",
          `${hero.name} finds no targets for ${hero.special}!`
        );
      }
      hero.cooldown = skill?.cooldown || 0;
    } else if (hero.cooldown > 0) {
      hero.cooldown--;
    }

    BattleManager.updateStats(
      formationHeroes,
      enemyGroup,
      roomNumber,
      totalRooms
    );
  }
}

/**
 * Manages enemy actions during battle.
 * @class
 */
class EnemyActions {
  /**
   * Executes turns for all enemies.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   */
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

  /**
   * Performs a single enemy turn, targeting heroes by row priority.
   * @param {Object} enemy - The enemy acting.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<Object>} enemyGroup - Room enemies.
   * @param {number} roomNumber - Current room.
   * @param {number} totalRooms - Total rooms.
   */
  static async performEnemyTurn(
    enemy,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    const living = formationHeroes.filter((h) => h.hp > 0);
    if (!living.length) return;

    let targets = living.filter((h) => gameState.formation.indexOf(h.id) < 3); // Front row
    if (!targets.length)
      targets = living.filter((h) => gameState.formation.indexOf(h.id) < 6); // Middle row
    if (!targets.length) targets = living; // Back row

    if (targets.length > 0) {
      const target = targets[Math.floor(Math.random() * targets.length)];
      if (Math.random() < enemy.hitChance) {
        let damage = Math.round(enemy.damage);
        if (target.class === "warrior") {
          const passive = heroPassives.find((p) => p.name === target.passive);
          if (passive?.type === "damageReduction")
            damage = Math.round(passive.apply(target, null, damage));
        }
        target.hp = Math.max(0, Math.round(target.hp - damage));
        BattleManager.logEntry(
          "enemy-attack",
          `The ${enemy.type} hits ${target.name} for ${damage} damage! (${
            target.name
          } HP: ${Math.round(target.hp)}/${target.maxHp})`
        );
        if (target.hp <= 0) {
          gameState.casualties.push(target.id);
          BattleManager.logEntry("system", `${target.name} falls in battle!`);
        }
      } else {
        BattleManager.logEntry(
          "enemy-attack",
          `The ${enemy.type} misses ${target.name}!`
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

/**
 * Manages passive abilities during battle.
 * @class
 */
class PassiveEffects {
  /**
   * Applies hero passives, handling position-based effects.
   * @param {Object} hero - The hero with a passive.
   * @param {Array<Object>} formationHeroes - Active heroes.
   * @param {Array<string|null>} formation - Formation grid (indices 0–8).
   */
  static applyPassive(hero, formationHeroes, formation = gameState.formation) {
    const passive = heroPassives.find(
      (p) => p.name === hero.passive && p.appliesTo.includes(hero.class)
    );
    if (!passive) return;

    switch (passive.type) {
      case "damageReduction":
        const reduced = passive.apply(hero, null, 100);
        if (reduced < 100)
          BattleManager.logEntry(
            "special",
            `${hero.name}'s ${passive.name} reduces damage by ${Math.floor(
              (1 - reduced / 100) * 100
            )}%.`
          );
        break;
      case "hitChanceBoost":
        const hitChance = passive.apply(hero);
        if (hitChance > hero.hitChance)
          BattleManager.logEntry(
            "special",
            `${hero.name}'s ${passive.name} boosts hit chance by ${Math.floor(
              (hitChance - hero.hitChance) * 100
            )}%.`
          );
        break;
      case "damageBoost":
        const boosted = passive.apply(hero, 100);
        if (boosted > 100)
          BattleManager.logEntry(
            "special",
            `${hero.name}'s ${passive.name} boosts damage by ${Math.floor(
              (boosted / 100 - 1) * 100
            )}%.`
          );
        break;
      case "heal":
        const healed = formationHeroes.filter((h) => h.hp < h.maxHp);
        if (healed.length > 0) {
          passive.apply(hero, formationHeroes);
          healed.forEach((ally) => {
            const heal = Math.round(
              ally.hp -
                (ally.hp -
                  hero.attack *
                    (formation.indexOf(hero.id) >= 6 &&
                    formation.indexOf(hero.id) <= 8
                      ? 0.8
                      : 0.4))
            );
            BattleManager.logEntry(
              "heal",
              `${hero.name} heals ${ally.name} for ${heal} HP via ${
                passive.name
              }! (${ally.name} HP: ${Math.round(ally.hp)}/${ally.maxHp})`
            );
          });
        }
        break;
    }
  }
}

/**
 * Updates hero stats UI during battle.
 * @param {Array<Object>} formationHeroes - Active heroes.
 */
function updateHeroStats(formationHeroes) {
  heroStatsList.innerHTML = "";
  formationHeroes.forEach((hero) => {
    const stat = document.createElement("div");
    stat.className = "hero-stat";
    stat.innerHTML = `
      <span>${hero.name.split(" ")[0]} (Lv${hero.level})</span>
      <div class="stat-hp-bar"><div class="stat-hp-fill${
        hero.hp / hero.maxHp <= 0.3 ? " low" : ""
      }" style="width: ${Math.floor(
      (hero.hp / hero.maxHp) * 100
    )}%;"></div></div>
      <span>${Math.round(hero.hp)}/${hero.maxHp}</span>
    `;
    heroStatsList.appendChild(stat);
  });
}

/**
 * Updates enemy stats UI during battle.
 * @param {Array<Object>} enemyGroup - Room enemies.
 * @param {number} roomNumber - Current room.
 * @param {number} totalRooms - Total rooms.
 */
function updateEnemyStats(enemyGroup, roomNumber, totalRooms) {
  enemyStatsList.innerHTML = "";
  if (!enemyGroup || !enemyGroup.length) {
    enemyStatsList.innerHTML = "<span>No enemies remaining.</span>";
    return;
  }

  const isBoss = roomNumber === totalRooms;
  enemyGroup.forEach((enemy) => {
    const stat = document.createElement("div");
    stat.innerHTML = `
      <span>${isBoss ? "Boss: " : ""}${enemy.type}</span>
      <div class="stat-hp-bar"><div class="stat-hp-fill${
        enemy.hp / enemy.maxHp <= 0.3 ? " low" : ""
      }" style="width: ${Math.floor(
      (enemy.hp / enemy.maxHp) * 100
    )}%;"></div></div>
      <span>${Math.round(enemy.hp)}/${enemy.maxHp}</span>
    `;
    enemyStatsList.appendChild(stat);
  });
}

/**
 * Starts a dungeon mission, validating setup.
 */
function startMission() {
  if (!gameState.selectedDungeon) {
    alert("Select a dungeon first!");
    return;
  }
  if (!gameState.formation.some((id) => id !== null)) {
    alert("Assign at least one hero!");
    return;
  }

  mainScreen.style.display = "none";
  battleScreen.style.display = "flex";
  dungeonName.textContent = gameState.selectedDungeon.name;
  battleLog.innerHTML = ""; // Clear log
  battleProgress.style.width = "0%";
  document.querySelector(".progress-text").textContent = "0%";
  exitBtn.disabled = true; // Disable until battle ends
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
  BattleManager.start(
    gameState.selectedDungeon,
    gameState.selectedDungeon.roomCount
  );
}

/**
 * Generates enemies for a dungeon room.
 * @param {Object} dungeon - Dungeon data.
 * @param {number} roomNumber - Room index.
 * @param {boolean} isBossRoom - If this is a boss room.
 * @returns {Array<Object>} Enemy group.
 */
function generateEnemyGroup(dungeon, roomNumber, isBossRoom) {
  const {
    enemyCountOnRoom,
    enemies,
    enemyStats,
    bosses,
    bossStats,
    bossCount,
  } = dungeon;
  const count = isBossRoom
    ? Math.floor(Math.random() * (bossCount.max - bossCount.min + 1)) +
      bossCount.min
    : Math.floor(
        Math.random() * (enemyCountOnRoom.max - enemyCountOnRoom.min + 1)
      ) + enemyCountOnRoom.min;
  const pool = isBossRoom ? bosses : enemies;
  const stats = isBossRoom ? bossStats : enemyStats;

  return Array(count)
    .fill(null)
    .map(() => ({
      type: pool[Math.floor(Math.random() * pool.length)],
      hp: stats.hp,
      maxHp: stats.hp,
      damage: Math.round(stats.damage),
      hitChance: stats.hitChance,
    }));
}

/**
 * Logs a battle message to the UI.
 * @param {string} type - Log type (e.g., "attack", "heal").
 * @param {string} text - Log message.
 */
function addLogEntry(type, text) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  battleLog.appendChild(entry);
  battleLog.scrollTop = battleLog.scrollHeight; // Auto-scroll
}

/**
 * Displays mission results after battle.
 */
function showResults() {
  battleScreen.style.display = "none";
  resultsScreen.style.display = "flex";

  const victory = checkVictory();
  resultTitle.textContent = victory ? "Victory!" : "Defeat!";
  resultTitle.style.color = victory ? "#2ecc71" : "#e74c3c";

  casualtiesList.innerHTML = "";
  gameState.casualties.forEach((id) => {
    const hero = gameState.heroes.find((h) => h.id === id);
    if (hero) {
      const el = document.createElement("div");
      el.className = `hero-base hero ${hero.class}`;
      el.innerHTML = `<div class="shape"></div><div class="hero-info">${hero.name}</div>`;
      casualtiesList.appendChild(el);
    }
  });

  rewardsList.innerHTML = "";
  if (victory) {
    const reward = gameState.selectedDungeon.reward;
    gameState.gold += reward;
    rewardsList.innerHTML += `<div class="reward-item">Gold: ${reward}</div>`;
    rewardsList.innerHTML += `<div class="reward-item">Dungeon Cleared!</div>`;
  }

  gameState.heroes = gameState.heroes.filter(
    (h) => !gameState.casualties.includes(h.id)
  );
  gameState.formation = gameState.formation.map((id) =>
    gameState.casualties.includes(id) ? null : id
  );
}

/**
 * Toggles battle speed (0.5x, 1x, 2x, 4x).
 */
function toggleBattleSpeed() {
  const speeds = [0.5, 1, 2, 4];
  const index = speeds.indexOf(gameState.battleSpeed);
  gameState.battleSpeed = speeds[(index + 1) % speeds.length];
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`;
}

/**
 * Returns to the guild screen after results.
 */
function returnToGuild() {
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  gameState.day++; // Next day
  gameState.selectedDungeon = null;
  updateFormationGrid(); // Refresh formation
  renderHeroRoster(); // Refresh roster
  updateUI(); // Update UI
}

// Exit battle event listener
exitBtn.addEventListener("click", () => {
  if (!exitBtn.disabled) showResults();
});
