const dungeons = [
    {
      name: "Forest Ruins",
      description: "An abandoned forest ruin",
      difficulty: "Easy",
      reward: 200,
      roomCount: 3,
      enemyCountOnRoom: { min: 3, max: 5 },
      enemies: ["Goblin", "Kobold", "Wolf"],
      enemyStats: { hp: 40, damage: 10, hitChance: 0.8 },
      enemyXp: 1,
      bosses: ["Goblin Warlord", "Ancient Treant"],
      bossStats: { hp: 200, damage: 25, hitChance: 0.8 },
      bossCount: { min: 1, max: 1 },
      bossXP: 3,
    },
    {
      name: "Dark Caverns",
      description: "Caves with eerie undead",
      difficulty: "Medium",
      reward: 400,
      roomCount: 5,
      enemyCountOnRoom: { min: 4, max: 6 },
      enemies: ["Skeleton", "Ghoul", "Shadow"],
      enemyStats: { hp: 60, damage: 18, hitChance: 0.8 },
      enemyXp: 2,
      bosses: ["Skeleton King", "Ghoul Overlord"],
      bossStats: { hp: 300, damage: 45, hitChance: 0.8 },
      bossCount: { min: 1, max: 1 },
      bossXP: 4,
    },
    {
      name: "Dragon's Lair",
      description: "Lair guarded by a dragon",
      difficulty: "Hard",
      reward: 800,
      roomCount: 7,
      enemyCountOnRoom: { min: 5, max: 7 },
      enemies: ["Dragon", "Wyvern", "Demon"],
      enemyStats: { hp: 100, damage: 28, hitChance: 0.8 },
      enemyXp: 3,
      bosses: ["Elder Dragon", "Infernal Wyrm"],
      bossStats: { hp: 500, damage: 70, hitChance: 0.8 },
      bossCount: { min: 1, max: 2 },
      bossXP: 5,
      }
  ];
  
  // Browser-specific export for global access
  if (typeof window !== "undefined") {
      window.dungeons = dungeons;
  }