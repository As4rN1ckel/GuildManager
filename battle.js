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
  simulateBattle();
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
      damage: stats.damage,
    }));
}

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
            <span>${hero.hp}/${hero.maxHp}</span>
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
        <span>${enemy.hp}/${enemy.maxHp}</span>
      `;
    enemyStatsList.appendChild(enemyStat);
  });
}

function simulateBattle() {
  const dungeon = gameState.selectedDungeon;
  const totalRooms = dungeon.roomCount;
  let currentRoom = 0;
  gameState.casualties = [];

  // Generate enemy groups for each room
  const roomEnemies = Array(totalRooms)
    .fill(null)
    .map((_, i) => {
      const isBossRoom = i === totalRooms - 1;
      return generateEnemyGroup(dungeon, i, isBossRoom);
    });

  addLogEntry("system", `Your party enters ${dungeon.name}...`);

  const battleInterval = setInterval(() => {
    if (currentRoom >= totalRooms) {
      clearInterval(battleInterval);
      addLogEntry(
        "system",
        "All rooms cleared! The dungeon is conquered. Press Exit to review the results."
      );
      exitBtn.disabled = false; // Unlock Exit button, but don’t show results yet
      return;
    }

    currentRoom++;
    const progress = Math.min(
      100,
      Math.floor((currentRoom / totalRooms) * 100)
    ); // Cap at 100%
    battleProgress.style.width = `${progress}%`;
    document.querySelector(".progress-text").textContent = `${progress}%`;

    const formationHeroes = gameState.formation
      .filter((id) => id !== null)
      .map((id) => gameState.heroes.find((h) => h.id === id))
      .filter((hero) => hero && !gameState.casualties.includes(hero.id));

    if (formationHeroes.length === 0) {
      clearInterval(battleInterval);
      addLogEntry(
        "system",
        "All heroes have fallen! The battle is lost. Press Exit to review the results."
      );
      updateHeroStats(formationHeroes);
      updateEnemyStats(
        roomEnemies[currentRoom - 1] || [],
        currentRoom,
        totalRooms
      );
      exitBtn.disabled = false;
      return;
    }

    const roomCleared = simulateBattleRoom(
      currentRoom,
      totalRooms,
      formationHeroes,
      roomEnemies[currentRoom - 1]
    );
    updateHeroStats(formationHeroes);
    updateEnemyStats(roomEnemies[currentRoom - 1], currentRoom, totalRooms);

    if (!roomCleared) {
      currentRoom--; // Repeat room if enemies remain
      const adjustedProgress = Math.min(
        100,
        Math.floor(((currentRoom + 0.5) / totalRooms) * 100)
      );
      battleProgress.style.width = `${adjustedProgress}%`;
      document.querySelector(
        ".progress-text"
      ).textContent = `${adjustedProgress}%`;
    }
  }, 2000 / (gameState.battleSpeed || 1));
}

function simulateBattleRoom(
  roomNumber,
  totalRooms,
  formationHeroes,
  enemyGroup
) {
  if (!enemyGroup || !formationHeroes.length) {
    addLogEntry("system", "Error: No enemies or heroes to fight!");
    return false;
  }

  const dungeon = gameState.selectedDungeon;
  const isBossRoom = roomNumber === totalRooms;
  addLogEntry(
    "system",
    `Your party enters Room ${roomNumber} ${
      isBossRoom ? "and faces the boss" : ""
    }: ${enemyGroup.map((e) => e.type).join(", ")} (${enemyGroup
      .map((e) => `${e.hp}/${e.maxHp}`)
      .join(", ")} HP)!`
  );

  let allEnemiesDefeated = false;

  // Continue battling until all enemies in the room are defeated or heroes are wiped
  while (!allEnemiesDefeated && formationHeroes.length > 0) {
    // Heroes attack enemies (unchanged for this update)
    formationHeroes.forEach((hero, index) => {
      applyPassiveEffects(hero, formationHeroes, index);

      // Always attempt to attack (100% chance, 80% hit)
      let damage = hero.attack;
      if (hero.class !== "warrior") {
        const passive = passiveAbilities.find((p) => p.name === hero.passive);
        if (passive) damage *= passive.value;
      }

      const targetEnemy = enemyGroup.find((e) => e.hp > 0) || null;
      if (targetEnemy && Math.random() < 0.8) {
        // 80% hit chance
        targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
        addLogEntry(
          "attack",
          `${hero.name} attacks ${targetEnemy.type} for ${damage} damage! (${targetEnemy.type} HP: ${targetEnemy.hp}/${targetEnemy.maxHp})`
        );
      } else if (targetEnemy) {
        addLogEntry("attack", `${hero.name} misses ${targetEnemy.type}!`);
      } else {
        addLogEntry("attack", `${hero.name} finds no enemies left to attack!`);
      }
      updateHeroStats(formationHeroes); // Refresh after hero action
      updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Refresh after enemy damage

      // Separate 20% chance for special, checked after attack
      if (Math.random() < 0.2 && hero.cooldown === 0) {
        const special = specialAbilities.find((s) => s.name === hero.special);
        let specialDamage = hero.attack * ((special && special.value) || 1.0);
        if (hero.class !== "warrior") {
          const passive = passiveAbilities.find((p) => p.name === hero.passive);
          if (passive) specialDamage *= passive.value;
        }

        const specialTarget = enemyGroup.find((e) => e.hp > 0) || null;
        if (specialTarget && Math.random() < 0.8) {
          // 80% hit chance for special
          specialTarget.hp = Math.max(0, specialTarget.hp - specialDamage);
          addLogEntry(
            "special",
            `${hero.name} uses ${hero.special} for ${specialDamage} damage! (${specialTarget.type} HP: ${specialTarget.hp}/${specialTarget.maxHp})`
          );
        } else if (specialTarget) {
          addLogEntry("special", `${hero.name} misses with ${hero.special}!`);
        } else {
          addLogEntry(
            "special",
            `${hero.name} finds no enemies left for ${hero.special}!`
          );
        }
        hero.cooldown = 2;
      } else if (hero.cooldown > 0) {
        hero.cooldown--;
      }

      if (hero.class === "cleric") {
        const injuredAllies = formationHeroes.filter(
          (ally) => ally.hp < ally.maxHp
        );
        if (injuredAllies.length > 0) {
          const healTarget =
            injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
          const special = specialAbilities.find((s) => s.name === hero.special);
          const healAmount = Math.floor(
            hero.attack * ((special && special.value) || 1.0)
          );
          healTarget.hp = Math.min(
            healTarget.maxHp,
            healTarget.hp + healAmount
          );
          addLogEntry(
            "heal",
            `${hero.name} heals ${healTarget.name} for ${healAmount} HP! (${healTarget.name} HP: ${healTarget.hp}/${healTarget.maxHp})`
          );
        } else {
          addLogEntry("heal", `${hero.name} finds no allies needing healing!`);
        }
        updateHeroStats(formationHeroes); // Refresh after heal
      }

      updateHeroStats(formationHeroes); // Refresh after all hero actions
      updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Refresh after enemy damage
    });

    // Check if all enemies in the room are defeated
    allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);

    if (!allEnemiesDefeated) {
      // Enemies attack one hero each, prioritizing front row, random within row
      enemyGroup.forEach((enemy) => {
        if (enemy.hp > 0) {
          const livingHeroes = formationHeroes.filter((h) => h.hp > 0);
          if (livingHeroes.length === 0) return; // No living heroes to target

          let targetHeroesInRow = [];
          // Try front row first (indices 0-2)
          targetHeroesInRow = livingHeroes.filter(
            (h) => gameState.formation.indexOf(h.id) < 3 && h.hp > 0
          );
          if (targetHeroesInRow.length === 0) {
            // Try middle row (indices 3-5)
            targetHeroesInRow = livingHeroes.filter(
              (h) => gameState.formation.indexOf(h.id) < 6 && h.hp > 0
            );
          }
          if (targetHeroesInRow.length === 0) {
            // Try back row (indices 6-8)
            targetHeroesInRow = livingHeroes.filter((h) => h.hp > 0);
          }

          if (targetHeroesInRow.length > 0) {
            const targetHero =
              targetHeroesInRow[
                Math.floor(Math.random() * targetHeroesInRow.length)
              ]; // Randomly select from available heroes in the row
            if (Math.random() < 0.8) {
              // Uniform 80% hit chance
              let damage = enemy.damage;
              if (targetHero.class === "warrior") {
                const passive = passiveAbilities.find(
                  (p) => p.name === targetHero.passive
                );
                damage = Math.floor(damage * (passive ? passive.value : 1));
              }
              targetHero.hp = Math.max(0, targetHero.hp - damage);
              addLogEntry(
                "enemy-attack",
                `The ${enemy.type} hits ${targetHero.name} for ${damage} damage! (${targetHero.name} HP: ${targetHero.hp}/${targetHero.maxHp})`
              );
              if (targetHero.hp <= 0) {
                gameState.casualties.push(targetHero.id);
                addLogEntry("system", `${targetHero.name} falls in battle!`);
                formationHeroes = formationHeroes.filter(
                  (h) => h.id !== targetHero.id
                );
              }
            } else {
              addLogEntry(
                "enemy-attack",
                `The ${enemy.type} misses ${targetHero.name}!`
              );
            }
          }
        }
      });
      updateHeroStats(formationHeroes); // Refresh after enemy actions
      updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Refresh after enemy actions
    }

    // XP and Level-Up reward for clearing the room (per enemy defeated)
    if (allEnemiesDefeated) {
      const xpPerEnemy = isBossRoom ? dungeon.bossXP : dungeon.enemyXp;
      const xpGained = xpPerEnemy * enemyGroup.length;
      addLogEntry("xp-level", `Heroes gained ${xpGained} XP.`);
      formationHeroes.forEach((hero) => {
        hero.xp += xpGained; // Add XP to each hero
        levelUpHero(hero); // Check for level-up after each room
      });

      updateHeroStats(formationHeroes); // Refresh stats to show new XP and levels
      updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Refresh after clearing
    }

    battleLog.scrollTop = battleLog.scrollHeight;
  }

  return allEnemiesDefeated;
}

function applyPassiveEffects(hero, formationHeroes, index) {
  switch (hero.class) {
    case "warrior":
      const warriorPassive = passiveAbilities.find(
        (p) => p.name === hero.passive
      );
      addLogEntry(
        "special",
        `${hero.name}'s passive ${
          warriorPassive.name
        } reduces incoming damage by ${Math.floor(
          (1 - warriorPassive.value) * 100
        )}%.`
      );
      break; // No attack boost; effect applied later during enemy attack
    case "archer":
      const archerPassive = passiveAbilities.find(
        (p) => p.name === hero.passive
      );
      addLogEntry(
        "special",
        `${hero.name}'s passive ${
          archerPassive.name
        } increases damage by ${Math.floor((archerPassive.value - 1) * 100)}%.`
      );
      break;
    case "mage":
      const magePassive = passiveAbilities.find((p) => p.name === hero.passive);
      addLogEntry(
        "special",
        `${hero.name}'s passive ${
          magePassive.name
        } increases damage by ${Math.floor((magePassive.value - 1) * 100)}%.`
      );
      break;
    case "cleric":
      const clericPassive = passiveAbilities.find(
        (p) => p.name === hero.passive
      );
      formationHeroes.forEach((ally) => {
        if (ally.hp < ally.maxHp) {
          const healAmount = Math.floor(hero.attack * clericPassive.value);
          ally.hp = Math.min(ally.maxHp, ally.hp + healAmount);
          addLogEntry(
            "heal",
            `${hero.name}'s passive ${clericPassive.name} heals ${ally.name} for ${healAmount} HP. (${ally.name} HP: ${ally.hp}/${ally.maxHp})`
          );
        }
      });
      if (formationHeroes.every((ally) => ally.hp === ally.maxHp)) {
        addLogEntry(
          "heal",
          `${hero.name}'s passive ${clericPassive.name} finds no allies needing healing!`
        );
      }
      break;
  }
}

function addLogEntry(type, text) {
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`;
  entry.textContent = text;
  battleLog.appendChild(entry);
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
  gameState.battleSpeed = gameState.battleSpeed === 1 ? 2 : 1;
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
