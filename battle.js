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
  if (!gameState.selectedDungeon) return;
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

function updateEnemyStats(enemyGroup, step, totalSteps) {
  enemyStatsList.innerHTML = "";
  const enemyStat = document.createElement("div");
  enemyStat.innerHTML = `
        <span>${step === totalSteps ? "Boss: " : ""}${enemyGroup.type}</span>
        <div class="stat-hp-bar">
            <div class="stat-hp-fill${
              enemyGroup.hp / enemyGroup.maxHp <= 0.3 ? " low" : ""
            }" style="width: ${Math.floor(
    (enemyGroup.hp / enemyGroup.maxHp) * 100
  )}%;"></div>
        </div>
        <span>${enemyGroup.hp}/${enemyGroup.maxHp}</span>
    `;
  enemyStatsList.appendChild(enemyStat);
}

function simulateBattle() {
  const dungeon = gameState.selectedDungeon;
  const totalSteps = dungeon.enemyCount;
  let currentStep = 0;
  gameState.casualties = [];

  const enemyGroups = Array(totalSteps)
    .fill(null)
    .map((_, i) => {
      const difficulty = dungeon.difficulty.toLowerCase();
      const baseStats = enemyStats[difficulty];
      const enemyTypes = enemyGroupsTemplate[difficulty];
      return {
        type:
          i === totalSteps - 1
            ? bossNames[difficulty][
                Math.floor(Math.random() * bossNames[difficulty].length)
              ]
            : enemyTypes[Math.floor(Math.random() * enemyTypes.length)],
        hp: baseStats.hp * (i + 1),
        maxHp: baseStats.hp * (i + 1),
        damage: baseStats.damage * (i + 1),
      };
    });

  addLogEntry("system", `Your party enters ${dungeon.name}...`);

  const battleInterval = setInterval(() => {
    currentStep++;
    const progress = Math.floor((currentStep / totalSteps) * 100);
    battleProgress.style.width = `${progress}%`;
    document.querySelector(".progress-text").textContent = `${progress}%`;

    const formationHeroes = gameState.formation
      .filter((id) => id !== null)
      .map((id) => gameState.heroes.find((h) => h.id === id))
      .filter((hero) => hero && !gameState.casualties.includes(hero.id));

    if (formationHeroes.length === 0) {
      clearInterval(battleInterval);
      addLogEntry("system", "All heroes have fallen! The battle is lost.");
      updateHeroStats(formationHeroes); // Update even on loss
      updateEnemyStats(enemyGroups[currentStep - 1], currentStep, totalSteps);
      exitBtn.disabled = false;
      return;
    }

    simulateBattleStep(
      currentStep,
      totalSteps,
      formationHeroes,
      enemyGroups[currentStep - 1]
    );
    updateHeroStats(formationHeroes); // Update after each step
    updateEnemyStats(enemyGroups[currentStep - 1], currentStep, totalSteps); // Update enemy stats

    if (
      currentStep >= totalSteps &&
      enemyGroups.every((group) => group.hp <= 0)
    ) {
      clearInterval(battleInterval);
      setTimeout(() => {
        addLogEntry(
          "system",
          "All enemies defeated! The battle is won. Review the results."
        );
        exitBtn.disabled = false;
      }, 1000);
    } else if (enemyGroups[currentStep - 1].hp > 0) {
      currentStep--;
      battleProgress.style.width = `${Math.floor(
        ((currentStep + 0.5) / totalSteps) * 100
      )}%`;
      document.querySelector(".progress-text").textContent = `${Math.floor(
        ((currentStep + 0.5) / totalSteps) * 100
      )}%`;
    }
  }, 2000 / (gameState.battleSpeed || 1));
}

function simulateBattleStep(step, totalSteps, formationHeroes, enemyGroup) {
  if (!enemyGroup || !formationHeroes.length) {
    addLogEntry("system", "Error: No enemies or heroes to fight!");
    return;
  }

  addLogEntry(
    "system",
    `Your party encounters ${step === totalSteps ? "the " : "a group of "}${
      enemyGroup.type
    } (${enemyGroup.hp}/${enemyGroup.maxHp} HP)!`
  );

  // Heroes attack enemies
  formationHeroes.forEach((hero, index) => {
    applyPassiveEffects(hero, formationHeroes, index);

    const randomAction = Math.random();
    if (randomAction < 0.75) {
      // 75% chance to atk
      let damage = hero.attack;
      if (hero.class !== "warrior") {
        // Warriors no longer boost damage
        const passive = passiveAbilities.find((p) => p.name === hero.passive);
        if (passive) damage *= passive.value;
      }

      if (Math.random() < 0.8) {
        enemyGroup.hp = Math.max(0, enemyGroup.hp - damage);
        addLogEntry(
          "attack",
          `${hero.name} attacks the ${enemyGroup.type} for ${damage} damage! (${enemyGroup.type} HP: ${enemyGroup.hp}/${enemyGroup.maxHp})`
        );
      } else {
        addLogEntry("attack", `${hero.name} misses the ${enemyGroup.type}!`);
      }
    } else if (randomAction < 0.85 && hero.cooldown === 0) {
      // 25% chance to special
      const special = specialAbilities.find((s) => s.name === hero.special);
      let specialDamage = hero.attack * ((special && special.value) || 1.0);
      if (hero.class !== "warrior") {
        const passive = passiveAbilities.find((p) => p.name === hero.passive);
        if (passive) specialDamage *= passive.value;
      }

      if (Math.random() < 0.8) {
        enemyGroup.hp = Math.max(0, enemyGroup.hp - specialDamage);
        addLogEntry(
          "special",
          `${hero.name} uses ${hero.special} for ${specialDamage} damage! (${enemyGroup.type} HP: ${enemyGroup.hp}/${enemyGroup.maxHp})`
        );
      } else {
        addLogEntry("special", `${hero.name} misses with ${hero.special}!`);
      }
      hero.cooldown = 2;
    } else if (hero.class === "cleric") {
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
        healTarget.hp = Math.min(healTarget.maxHp, healTarget.hp + healAmount);
        addLogEntry(
          "heal",
          `${hero.name} heals ${healTarget.name} for ${healAmount} HP! (${healTarget.name} HP: ${healTarget.hp}/${healTarget.maxHp})`
        );
      } else {
        addLogEntry("heal", `${hero.name} finds no allies needing healing!`);
      }
    }

    if (hero.cooldown > 0) hero.cooldown--;
  });

  // XP and Level Up Reward after killing group of enemies
  if (enemyGroup.hp <= 0) {
    const xpAward = step === totalSteps ? 3 : 1;
    formationHeroes.forEach((hero) => {
      hero.xp += xpAward;
      levelUpHero(hero);
    });
    addLogEntry(
      "xp-level", // Changed from "system"
      `Heroes gained ${xpAward} XP.`
    );
  }

  // Enemies attack heroes if still alive
  if (enemyGroup.hp > 0) {
    formationHeroes.forEach((hero, index) => {
      let hitChance = index < 3 ? 0.9 : index < 6 ? 0.7 : 0.5; // Front, middle, back
      if (Math.random() < hitChance) {
        let damage = Math.floor(
          enemyGroup.damage * (index < 3 ? 1 : index < 6 ? 0.8 : 0.5)
        );
        if (hero.class === "warrior") {
          const passive = passiveAbilities.find((p) => p.name === hero.passive);
          damage = Math.floor(damage * (passive ? passive.value : 1));
        }
        hero.hp = Math.max(0, hero.hp - damage);
        addLogEntry(
          "enemy-attack",
          `The ${enemyGroup.type} hits ${hero.name} for ${damage} damage! (${hero.name} HP: ${hero.hp}/${hero.maxHp})`
        );
        if (hero.hp <= 0) {
          gameState.casualties.push(hero.id);
          addLogEntry("system", `${hero.name} falls in battle!`);
        }
      } else {
        addLogEntry(
          "enemy-attack",
          `The ${enemyGroup.type} misses ${hero.name}!`
        );
      }
    });
  } else {
    addLogEntry(
      "system",
      `The ${enemyGroup.type} ${
        step === totalSteps ? "has been defeated" : "are defeated"
      }!`
    );
  }

  battleLog.scrollTop = battleLog.scrollHeight;
}

function applyPassiveEffects(hero, formationHeroes, index) {
  switch (hero.class) {
    case "warrior":
      const warriorPassive = passiveAbilities.find(
        (p) => p.name === hero.passive
      );
      addLogEntry(
        "special",
        `${hero.name}'s passive reduces incoming damage by ${Math.floor(
          (1 - warriorPassive.value) * 100
        )}%.`
      );
      break; // No attack boost anymore; effect applied later during enemy attack
    case "archer":
      const archerPassive = passiveAbilities.find(
        (p) => p.name === hero.passive
      );
      addLogEntry(
        "special",
        `${hero.name}'s passive increases damage by ${
          (archerPassive.value - 1) * 100
        }%.`
      );
      break;
    case "mage":
      const magePassive = passiveAbilities.find((p) => p.name === hero.passive);
      addLogEntry(
        "special",
        `${hero.name}'s passive increases damage by ${
          (magePassive.value - 1) * 100
        }%.`
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
            `${hero.name}'s passive heals ${ally.name} for ${healAmount} HP. (${ally.name} HP: ${ally.hp}/${ally.maxHp})`
          );
        }
      });
      if (formationHeroes.every((ally) => ally.hp === ally.maxHp)) {
        addLogEntry(
          "heal",
          `${hero.name}'s passive finds no allies needing healing!`
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
