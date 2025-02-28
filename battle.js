// Battle simulation logic for the Fantasy Guild Manager game
// Handles combat mechanics, UI updates, and game state management during dungeon missions.

// DOM elements for battle-related UI components
const battleLog = document.getElementById("battle-log");          // Log container for battle messages
const battleProgress = document.getElementById("battle-progress"); // Progress bar for dungeon room completion
const dungeonName = document.getElementById("dungeon-name");      // Displays the current dungeon name
const resultTitle = document.getElementById("result-title");      // Shows mission outcome (Victory/Defeat)
const casualtiesList = document.getElementById("casualties-list"); // Lists heroes lost in battle
const rewardsList = document.getElementById("rewards-list");      // Displays mission rewards
const speedBtn = document.getElementById("speed-btn");            // Button to adjust battle speed
const exitBtn = document.getElementById("exit-btn");              // Button to exit battle and view results
const heroStatsList = document.getElementById("hero-stats-list"); // Container for hero stats during battle
const enemyStatsList = document.getElementById("enemy-stats-list"); // Container for enemy stats during battle

/**
 * BattleManager - Manages the overall battle flow, including dungeon room progression and combat outcomes.
 * @class
 */
class BattleManager {
  /**
   * Initiates a dungeon mission with the specified dungeon and number of rooms.
   * @param {Object} dungeon - The dungeon object containing name, enemies, and rewards.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @returns {Promise<void>} Resolves when the battle concludes or fails.
   */
  static async start(dungeon, totalRooms) {
    let currentRoom = 0; // Tracks the current room in the dungeon
    gameState.casualties = []; // Reset casualties for the new mission

    // Generate enemy groups for each room in the dungeon
    const roomEnemies = this.generateRooms(dungeon, totalRooms);
    this.logEntry("system", `Your party enters ${dungeon.name}...`);

    // Continue battling through rooms until completion or defeat
    while (currentRoom < totalRooms) {
      currentRoom++; // Move to the next room
      this.updateProgress(currentRoom, totalRooms); // Update the progress bar

      // Get the current formation of living heroes
      const formationHeroes = this.getFormationHeroes();
      if (!formationHeroes.length) {
        // If no heroes remain, handle defeat
        this.handleDefeat(formationHeroes, roomEnemies, currentRoom, totalRooms, dungeon);
        return;
      }

      // Simulate combat for the current room
      const roomCleared = await this.simulateRoom(
        currentRoom,
        totalRooms,
        formationHeroes,
        roomEnemies[currentRoom - 1],
        dungeon
      );
      this.updateStats(formationHeroes, roomEnemies[currentRoom - 1], currentRoom, totalRooms);

      if (!roomCleared) {
        // If the room isn’t cleared, retry the current room
        currentRoom--; // Step back to repeat the room
        this.updateProgress(currentRoom + 0.5, totalRooms); // Show partial progress
      }
    }

    // Mission success: all rooms cleared
    this.logEntry(
      "system",
      "All rooms cleared! The dungeon is conquered. Press Exit to review the results."
    );
    exitBtn.disabled = false; // Enable the exit button for result review
  }

  /**
   * Generates enemy groups for each room in the dungeon.
   * @param {Object} dungeon - The dungeon configuration with enemy data.
   * @param {number} totalRooms - Total number of rooms to generate enemies for.
   * @returns {Array<Object>} Array of enemy groups, one per room.
   */
  static generateRooms(dungeon, totalRooms) {
    // Create an array of enemy groups for each room, with the last room potentially containing a boss
    return Array(totalRooms)
      .fill(null)
      .map((_, i) => {
        const isBossRoom = i === totalRooms - 1; // Last room is the boss room
        return generateEnemyGroup(dungeon, i, isBossRoom);
      });
  }

  /**
   * Retrieves the list of living heroes currently in the formation.
   * @returns {Array<Object>} Array of hero objects from the formation, excluding casualties.
   */
  static getFormationHeroes() {
    // Filter out null slots, find corresponding heroes, and exclude fallen heroes
    return gameState.formation
      .filter((id) => id !== null) // Exclude empty formation slots
      .map((id) => gameState.heroes.find((h) => h.id === id)) // Map IDs to hero objects
      .filter((hero) => hero && !gameState.casualties.includes(hero.id)); // Remove nulls and casualties
  }

  /**
   * Simulates combat for a single room in the dungeon.
   * @param {number} roomNumber - The current room number being fought.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects for the room.
   * @param {Object} dungeon - The dungeon configuration.
   * @returns {Promise<boolean>} Resolves to true if the room is cleared, false otherwise.
   */
  static async simulateRoom(
    roomNumber,
    totalRooms,
    formationHeroes,
    enemyGroup,
    dungeon
  ) {
    // Check if there are enemies or heroes to fight
    if (!enemyGroup || !formationHeroes.length) {
      this.logEntry("system", "Error: No enemies or heroes to fight!");
      return false;
    }

    // Determine if this is the boss room and log the room entry
    const isBossRoom = roomNumber === totalRooms;
    this.logEntry(
      "system",
      `Your party enters Room ${roomNumber} ${
        isBossRoom ? "and faces the boss" : ""
      }: ${enemyGroup.map((e) => e.type).join(", ")} (${enemyGroup
        .map((e) => `${e.hp}/${e.maxHp}`)
        .join(", ")} HP)!`
    );

    // Run the battle loop until the room is cleared or heroes are defeated
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
   * Runs the turn-based battle loop for a room until victory or defeat.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects for the room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @param {boolean} isBossRoom - Indicates if this is the boss room.
   * @param {Object} dungeon - The dungeon configuration.
   * @returns {Promise<boolean>} Resolves to true if enemies are defeated, false otherwise.
   */
  static async runBattleLoop(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    isBossRoom,
    dungeon
  ) {
    let allEnemiesDefeated = false; // Track if all enemies are defeated

    // Continue the battle while there are living heroes and enemies
    while (!allEnemiesDefeated && formationHeroes.length > 0) {
      // Execute hero turns
      await HeroActions.performTurns(formationHeroes, enemyGroup, roomNumber, totalRooms);

      // Refresh heroes to exclude those who fell during their turns
      formationHeroes = this.getFormationHeroes(); // Update to exclude casualties
      allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0); // Check if all enemies are defeated

      if (allEnemiesDefeated) {
        // Handle room clearance if all enemies are defeated
        this.handleRoomClear(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon);
        return true;
      }

      // Execute enemy turns
      await EnemyActions.performTurns(formationHeroes, enemyGroup, roomNumber, totalRooms);

      // Refresh heroes again after enemy attacks
      formationHeroes = this.getFormationHeroes();
      allEnemiesDefeated = enemyGroup.every((enemy) => enemy.hp <= 0);
    }

    // Return true if enemies are defeated, false if heroes are wiped out
    if (allEnemiesDefeated) {
      this.handleRoomClear(formationHeroes, enemyGroup, roomNumber, totalRooms, isBossRoom, dungeon);
      return true;
    }
    return false;
  }

  /**
   * Handles the outcome when a room is successfully cleared.
   * @param {Array<Object>} formationHeroes - Array of surviving hero objects.
   * @param {Array<Object>} enemyGroup - Array of defeated enemy objects.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @param {boolean} isBossRoom - Indicates if this is the boss room.
   * @param {Object} dungeon - The dungeon configuration.
   */
  static handleRoomClear(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    isBossRoom,
    dungeon
  ) {
    // Calculate XP based on whether it’s a boss or regular enemy room
    const xpPerEnemy = isBossRoom ? dungeon.bossXP : dungeon.enemyXp;
    const xpGained = Math.round(xpPerEnemy * enemyGroup.length); // Ensure XP is a whole number
    this.logEntry("xp-level", `Heroes gained ${xpGained} XP.`);

    // Distribute XP to surviving heroes and check for level-ups
    formationHeroes.forEach((hero) => {
      hero.xp = Math.round(hero.xp + xpGained); // Update XP, ensuring it’s a whole number
      levelUpHero(hero); // Handle potential level-up logic
    });
  }

  /**
   * Handles the outcome when all heroes are defeated in battle.
   * @param {Array<Object>} formationHeroes - Array of hero objects (likely empty or defeated).
   * @param {Array<Object>} enemyGroup - Array of remaining enemy objects.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @param {Object} dungeon - The dungeon configuration.
   */
  static handleDefeat(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms,
    dungeon
  ) {
    // Log the defeat and enable the exit button for result review
    this.logEntry(
      "system",
      "All heroes have fallen! The battle is lost. Press Exit to review the results."
    );
    updateHeroStats(formationHeroes); // Update hero stats UI
    updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Update enemy stats UI
    exitBtn.disabled = false; // Allow exiting to see results
  }

  /**
   * Updates the battle progress bar based on current room progress.
   * @param {number} currentRoom - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   */
  static updateProgress(currentRoom, totalRooms) {
    // Calculate and cap progress at 100%
    const progress = Math.min(100, Math.floor((currentRoom / totalRooms) * 100));
    battleProgress.style.width = `${progress}%`; // Update progress bar width
    document.querySelector(".progress-text").textContent = `${progress}%`; // Update progress text
  }

  /**
   * Updates the UI with current hero and enemy stats during battle.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   */
  static updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms) {
    updateHeroStats(formationHeroes); // Refresh hero stats display
    updateEnemyStats(enemyGroup, roomNumber, totalRooms); // Refresh enemy stats display
  }

  /**
   * Adds a new entry to the battle log with the specified type and text.
   * @param {string} type - The type of log entry (e.g., "attack", "heal", "system").
   * @param {string} text - The text message to display in the log.
   */
  static logEntry(type, text) {
    addLogEntry(type, text); // Delegate to the addLogEntry function for UI updates
  }
}

/**
 * HeroActions - Manages hero actions during battle, including attacks, specials, and passives.
 * @class
 */
class HeroActions {
  /**
   * Executes turns for all heroes in the formation.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @returns {Promise<void>} Resolves when all hero turns are complete.
   */
  static async performTurns(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    // Create a copy of heroes to avoid modifying the original array during iteration
    const activeHeroes = [...formationHeroes];
    for (let i = 0; i < activeHeroes.length; i++) {
      const hero = activeHeroes[i];
      if (hero.hp <= 0) continue; // Skip heroes who are already defeated

      // Introduce a delay to simulate turn-based pacing, adjusted by battle speed
      await new Promise((resolve) => setTimeout(resolve, 500 / (gameState.battleSpeed || 1)));
      await this.performHeroTurn(hero, formationHeroes, enemyGroup, roomNumber, totalRooms);

      // Check if the hero was defeated during their turn (e.g., from enemy counterattacks)
      if (hero.hp <= 0) {
        gameState.casualties.push(hero.id); // Mark hero as a casualty
        BattleManager.logEntry("system", `${hero.name} falls in battle!`);
      }
    }
  }

  /**
   * Performs a single hero's turn, including attacks, specials, and passives.
   * @param {Object} hero - The hero object performing the turn.
   * @param {Array<Object>} formationHeroes - Array of all hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @returns {Promise<void>} Resolves when the hero's turn is complete.
   */
  static async performHeroTurn(
    hero,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    // Apply any passive effects before the hero acts
    PassiveEffects.applyPassive(hero, formationHeroes);

    // Calculate effective hit chance, accounting for passive boosts (e.g., for Archers)
    let effectiveHitChance = hero.hitChance;
    if (hero.class === "archer") {
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (passive && passive.type === "hitChanceBoost") {
        effectiveHitChance = Math.min(1.0, effectiveHitChance + passive.value);
      }
    }

    let damage = Math.round(hero.attack); // Round base attack damage to a whole number
    if (hero.class !== "warrior") {
      // Apply passive damage boosts for non-Warriors (except Archers)
      const passive = heroPassives.find((p) => p.name === hero.passive);
      if (passive && passive.type === "damageBoost" && hero.class !== "archer") {
        damage = Math.round(passive.apply(hero, damage)); // Apply and round boosted damage
      }
    }

    // Target the first living enemy
    const targetEnemy = enemyGroup.find((e) => e.hp > 0) || null;
    if (targetEnemy && Math.random() < effectiveHitChance) {
      // Successful hit: reduce enemy HP and log the attack
      targetEnemy.hp = Math.max(0, targetEnemy.hp - damage);
      BattleManager.logEntry(
        "attack",
        `${hero.name} attacks ${targetEnemy.type} for ${damage} damage! (${
          targetEnemy.type
        } HP: ${Math.round(targetEnemy.hp)}/${targetEnemy.maxHp})`
      );
    } else if (targetEnemy) {
      // Missed attack
      BattleManager.logEntry("attack", `${hero.name} misses ${targetEnemy.type}!`);
    } else {
      // No enemies left to attack
      BattleManager.logEntry("attack", `${hero.name} finds no enemies left to attack!`);
    }
    BattleManager.updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms);

    // Attempt to use a special ability if conditions are met
    if (Math.random() < 0.2 && hero.cooldown === 0) { // 20% chance to use special, no cooldown active
      const skill = heroSkills.find((s) => s.name === hero.special);
      let specialDamage = Math.round(hero.attack * ((skill && skill.value) || 1.0)); // Base special damage
      if (hero.class !== "warrior") {
        // Apply passive damage boosts for non-Warriors (except Archers)
        const passive = heroPassives.find((p) => p.name === hero.passive);
        if (passive && passive.type === "damageBoost" && hero.class !== "archer") {
          specialDamage = Math.round(passive.apply(hero, specialDamage)); // Boost and round special damage
        }
      }

      const specialTarget = enemyGroup.find((e) => e.hp > 0) || null;
      if (specialTarget && Math.random() < effectiveHitChance) {
        if (skill.type === "damage") {
          // Apply damage-based special (e.g., Fireball, Shield Bash)
          specialDamage = Math.round(skill.apply(hero, specialTarget, specialDamage));
          specialTarget.hp = Math.max(0, specialTarget.hp - specialDamage);
          BattleManager.logEntry(
            "special",
            `${hero.name} uses ${hero.special} for ${specialDamage} damage! (${
              specialTarget.type
            } HP: ${Math.round(specialTarget.hp)}/${specialTarget.maxHp})`
          );
        } else if (skill.type === "heal") {
          // Apply healing-based special (e.g., Heal)
          skill.apply(hero, formationHeroes);
          BattleManager.logEntry("heal", `${hero.name} uses ${hero.special} to heal allies!`);
        }
      } else if (specialTarget) {
        // Missed special ability
        BattleManager.logEntry("special", `${hero.name} misses with ${hero.special}!`);
      } else {
        // No enemies left for special
        BattleManager.logEntry("special", `${hero.name} finds no enemies left for ${hero.special}!`);
      }
      hero.cooldown = skill.cooldown; // Set cooldown after using special
    } else if (hero.cooldown > 0) {
      // Decrease cooldown if active
      hero.cooldown--;
    }

    // Handle Cleric-specific healing logic
    if (hero.class === "cleric") {
      const injuredAllies = formationHeroes.filter((ally) => ally.hp < ally.maxHp);
      if (injuredAllies.length > 0) {
        const healTarget = injuredAllies[Math.floor(Math.random() * injuredAllies.length)];
        const skill = heroSkills.find((s) => s.name === hero.special);
        const healAmount = Math.round(hero.attack * ((skill && skill.value) || 1.0)); // Round heal amount
        healTarget.hp = Math.min(healTarget.maxHp, Math.round(healTarget.hp + healAmount)); // Cap and round healed HP
        BattleManager.logEntry(
          "heal",
          `${hero.name} heals ${healTarget.name} for ${healAmount} HP! (${
            healTarget.name
          } HP: ${Math.round(healTarget.hp)}/${healTarget.maxHp})`
        );
      } else {
        // No allies need healing
        BattleManager.logEntry("heal", `${hero.name} finds no allies needing healing!`);
      }
      BattleManager.updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms);
    }

    // Update UI after the hero's turn
    BattleManager.updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms);
  }
}

/**
 * EnemyActions - Manages enemy actions during battle, including targeting and attacking heroes.
 * @class
 */
class EnemyActions {
  /**
   * Executes turns for all enemies in the current room.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @returns {Promise<void>} Resolves when all enemy turns are complete.
   */
  static async performTurns(
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    // Iterate through each living enemy to perform their turn
    for (const enemy of enemyGroup) {
      if (enemy.hp > 0) {
        // Introduce a delay to simulate turn-based pacing, adjusted by battle speed
        await new Promise((resolve) => setTimeout(resolve, 500 / (gameState.battleSpeed || 1)));
        await this.performEnemyTurn(enemy, formationHeroes, enemyGroup, roomNumber, totalRooms);
      }
    }
  }

  /**
   * Performs a single enemy's turn, targeting and attacking heroes.
   * @param {Object} enemy - The enemy object performing the turn.
   * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
   * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
   * @param {number} roomNumber - The current room number.
   * @param {number} totalRooms - Total number of rooms in the dungeon.
   * @returns {Promise<void>} Resolves when the enemy's turn is complete.
   */
  static async performEnemyTurn(
    enemy,
    formationHeroes,
    enemyGroup,
    roomNumber,
    totalRooms
  ) {
    // Filter out defeated heroes
    const livingHeroes = formationHeroes.filter((h) => h.hp > 0);
    if (!livingHeroes.length) return; // Exit if no heroes remain

    let targetHeroesInRow = [];
    // Prioritize targeting heroes in the front row (indices 0-2)
    targetHeroesInRow = livingHeroes.filter((h) => gameState.formation.indexOf(h.id) < 3);
    if (!targetHeroesInRow.length) {
      // If no front-row heroes, target middle row (indices 3-5)
      targetHeroesInRow = livingHeroes.filter((h) => gameState.formation.indexOf(h.id) < 6);
    }
    if (!targetHeroesInRow.length) {
      // If no middle-row heroes, target back row (indices 6-8)
      targetHeroesInRow = livingHeroes;
    }

    if (targetHeroesInRow.length > 0) {
      // Randomly select a target from the prioritized row
      const targetHero = targetHeroesInRow[Math.floor(Math.random() * targetHeroesInRow.length)];
      if (Math.random() < enemy.hitChance) {
        let damage = Math.round(enemy.damage); // Round base enemy damage
        if (targetHero.class === "warrior") {
          // Apply damage reduction for Warriors via their passive
          const passive = heroPassives.find((p) => p.name === targetHero.passive);
          if (passive && passive.type === "damageReduction") {
            damage = Math.round(passive.apply(targetHero, null, damage));
          }
        }
        // Apply damage to the target hero
        targetHero.hp = Math.max(0, Math.round(targetHero.hp - damage));
        BattleManager.logEntry(
          "enemy-attack",
          `The ${enemy.type} hits ${targetHero.name} for ${damage} damage! (${
            targetHero.name
          } HP: ${Math.round(targetHero.hp)}/${targetHero.maxHp})`
        );
        if (targetHero.hp <= 0) {
          // If the hero is defeated, log the casualty
          gameState.casualties.push(targetHero.id);
          BattleManager.logEntry("system", `${targetHero.name} falls in battle!`);
        }
      } else {
        // Missed attack
        BattleManager.logEntry("enemy-attack", `The ${enemy.type} misses ${targetHero.name}!`);
      }
    }
    // Update UI after the enemy's turn
    BattleManager.updateStats(formationHeroes, enemyGroup, roomNumber, totalRooms);
  }
}

/**
 * PassiveEffects - Manages passive abilities for heroes during battle.
 * @class
 */
class PassiveEffects {
  /**
   * Applies the hero's passive ability, if applicable, before their turn.
   * @param {Object} hero - The hero object with a passive ability.
   * @param {Array<Object>} formationHeroes - Array of all hero objects in the formation.
   */
  static applyPassive(hero, formationHeroes) {
    // Find the passive ability matching the hero's class and name
    const passive = heroPassives.find(
      (p) => p.name === hero.passive && p.appliesTo.includes(hero.class)
    );
    if (!passive) return; // Exit if no matching passive is found

    switch (passive.type) {
      case "damageReduction":
        // Log damage reduction effect for the hero
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${passive.name} reduces incoming damage by ${Math.floor(
            (1 - passive.value) * 100
          )}%.`
        );
        break;
      case "hitChanceBoost":
        // Log hit chance boost for the hero
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${passive.name} increases hit chance by ${Math.floor(
            passive.value * 100
          )}%.`
        );
        break;
      case "damageBoost":
        // Log damage boost for the hero
        BattleManager.logEntry(
          "special",
          `${hero.name}'s passive ${passive.name} increases damage by ${Math.floor(
            (passive.value - 1) * 100
          )}%.`
        );
        break;
      case "heal":
        // Apply healing to injured allies if any exist
        const healedAllies = formationHeroes.filter((ally) => ally.hp < ally.maxHp);
        if (healedAllies.length > 0) {
          passive.apply(hero, formationHeroes); // Apply the healing passive
          const healAmount = Math.round(hero.attack * passive.value); // Calculate heal amount
          BattleManager.logEntry(
            "heal",
            `${hero.name}'s passive ${passive.name} heals all injured allies for ${healAmount} HP!`
          );
          // Log individual ally HP after healing
          healedAllies.forEach((ally) => {
            BattleManager.logEntry(
              "heal",
              `${ally.name} HP: ${Math.round(ally.hp)}/${ally.maxHp}`
            );
          });
        }
        break;
      default:
        break;
    }
  }
}

/**
 * Updates the UI with the current stats of heroes in the formation.
 * @param {Array<Object>} formationHeroes - Array of hero objects in the formation.
 */
function updateHeroStats(formationHeroes) {
  // Clear existing hero stats and rebuild for each living hero
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
            <span>${Math.round(hero.hp)}/${hero.maxHp}</span>  <!-- Round HP for display -->
        `;
    heroStatsList.appendChild(heroStat);
  });
}

/**
 * Updates the UI with the current stats of enemies in the room.
 * @param {Array<Object>} enemyGroup - Array of enemy objects in the current room.
 * @param {number} roomNumber - The current room number.
 * @param {number} totalRooms - Total number of rooms in the dungeon.
 */
function updateEnemyStats(enemyGroup, roomNumber, totalRooms) {
  // Clear existing enemy stats and rebuild for each enemy
  enemyStatsList.innerHTML = "";
  if (!enemyGroup || enemyGroup.length === 0) {
    enemyStatsList.innerHTML = "<span>No enemies remaining in this room.</span>";
    return;
  }

  // Determine if this is the boss room for labeling
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
        <span>${Math.round(enemy.hp)}/${enemy.maxHp}</span>  <!-- Round HP for display -->
      `;
    enemyStatsList.appendChild(enemyStat);
  });
}

/**
 * Initiates a dungeon mission when the player clicks "Embark on Mission".
 * Validates dungeon and formation before starting battle.
 */
function startMission() {
  // Check if a dungeon is selected
  if (!gameState.selectedDungeon) {
    alert("No dungeon selected! Please choose a dungeon first.");
    return;
  }
  // Check if at least one hero is in the formation
  if (!gameState.formation.some((id) => id !== null)) {
    alert("No heroes in formation! Assign at least one hero before embarking.");
    return;
  }

  // Hide main screen and show battle screen
  mainScreen.style.display = "none";
  battleScreen.style.display = "flex";
  dungeonName.textContent = gameState.selectedDungeon.name; // Set dungeon name
  battleLog.innerHTML = ""; // Clear previous battle log
  battleProgress.style.width = "0%"; // Reset progress bar
  document.querySelector(".progress-text").textContent = "0%"; // Reset progress text
  exitBtn.disabled = true; // Disable exit until battle ends
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`; // Set initial speed display
  BattleManager.start(gameState.selectedDungeon, gameState.selectedDungeon.roomCount); // Start the battle
}

/**
 * Generates a group of enemies for a specific room in the dungeon.
 * @param {Object} dungeon - The dungeon configuration with enemy data.
 * @param {number} roomNumber - The room number being generated for.
 * @param {boolean} isBossRoom - Indicates if this is a boss room.
 * @returns {Array<Object>} Array of enemy objects with stats.
 */
function generateEnemyGroup(dungeon, roomNumber, isBossRoom) {
  const { enemyCountOnRoom, enemies, enemyStats, bosses, bossStats, bossCount } = dungeon;
  // Determine the number of enemies based on room type (boss or regular)
  const enemyCount = isBossRoom
    ? Math.floor(Math.random() * (bossCount.max - bossCount.min + 1)) + bossCount.min
    : Math.floor(Math.random() * (enemyCountOnRoom.max - enemyCountOnRoom.min + 1)) + enemyCountOnRoom.min;
  const enemyPool = isBossRoom ? bosses : enemies; // Select enemy pool (bosses or regular enemies)
  const stats = isBossRoom ? bossStats : enemyStats; // Select appropriate stats

  // Create an array of enemies with randomized types and stats
  return Array(enemyCount)
    .fill(null)
    .map(() => ({
      type: enemyPool[Math.floor(Math.random() * enemyPool.length)],
      hp: stats.hp,
      maxHp: stats.hp,
      damage: Math.round(stats.damage), // Ensure damage is a whole number
      hitChance: stats.hitChance,
    }));
}

/**
 * Adds a new entry to the battle log with the specified type and text.
 * @param {string} type - The type of log entry (e.g., "attack", "heal", "system").
 * @param {string} text - The text message to display in the log.
 */
function addLogEntry(type, text) {
  // Create a new log entry element
  const entry = document.createElement("div");
  entry.className = `log-entry ${type}`; // Apply type-specific styling
  entry.textContent = text; // Set the log message
  battleLog.appendChild(entry); // Add to the log
  battleLog.scrollTop = battleLog.scrollHeight; // Auto-scroll to the latest entry
}

/**
 * Displays the mission results after a battle concludes.
 */
function showResults() {
  // Hide battle screen and show results screen
  battleScreen.style.display = "none";
  resultsScreen.style.display = "flex";

  // Determine if the mission was a victory
  const isVictory = checkVictory();
  resultTitle.textContent = isVictory ? "Victory!" : "Defeat!"; // Set result title
  resultTitle.style.color = isVictory ? "#2ecc71" : "#e74c3c"; // Colorize based on outcome

  // Populate casualties list
  casualtiesList.innerHTML = "";
  gameState.casualties.forEach((id) => {
    const hero = gameState.heroes.find((h) => h.id === id);
    if (hero) {
      const heroEl = document.createElement("div");
      heroEl.className = `hero-base hero ${hero.class}`; // Use hero-base for shape rendering
      heroEl.innerHTML = `<div class="shape"></div><div class="hero-info">${hero.name}</div>`;
      casualtiesList.appendChild(heroEl);
    }
  });

  // Populate rewards list
  rewardsList.innerHTML = "";
  if (isVictory) {
    const goldReward = gameState.selectedDungeon.reward;
    gameState.gold += goldReward; // Add gold to game state
    rewardsList.innerHTML += `<div class="reward-item">Gold: ${goldReward}</div>`;

    // List surviving heroes and mission success
    const survivors = gameState.formation
      .filter((id) => id && !gameState.casualties.includes(id))
      .map((id) => gameState.heroes.find((h) => h.id === id));
    rewardsList.innerHTML += `<div class="reward-item">Dungeon Cleared!</div>`;
  }

  // Update game state to reflect casualties and formation changes
  gameState.heroes = gameState.heroes.filter((h) => !gameState.casualties.includes(h.id));
  gameState.formation = gameState.formation.map((id) =>
    gameState.casualties.includes(id) ? null : id
  );
}

/**
 * Toggles the battle speed between predefined values.
 */
function toggleBattleSpeed() {
  // Cycle through available speeds: 0.5x, 1x, 2x, 4x
  const speeds = [0.5, 1, 2, 4];
  const currentIndex = speeds.indexOf(gameState.battleSpeed);
  gameState.battleSpeed = speeds[(currentIndex + 1) % speeds.length];
  speedBtn.textContent = `Speed: ${gameState.battleSpeed}x`; // Update button text
}

/**
 * Returns the player to the guild screen after viewing mission results.
 */
function returnToGuild() {
  // Hide results screen and show main screen
  resultsScreen.style.display = "none";
  mainScreen.style.display = "block";
  gameState.day++; // Advance to the next day
  gameState.selectedDungeon = null; // Clear dungeon selection
  updateFormationGrid(); // Refresh formation UI
  renderHeroRoster(); // Refresh hero roster UI
  updateUI(); // Update all UI elements
}

// Event listener for exiting the battle and viewing results
exitBtn.addEventListener("click", () => {
  if (!exitBtn.disabled) {
    showResults(); // Show results if exit is enabled
  }
});