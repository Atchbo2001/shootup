import fs from "node:fs/promises";
import path from "node:path";

const sourceArg = process.argv[2];
if (!sourceArg) throw new Error("Usage: node queue-tuning.mjs <source-directory>");

const configPath = path.join(path.resolve(sourceArg), "server", "config.json");
const config = JSON.parse(await fs.readFile(configPath, "utf8"));

config.maxGames = 4;
config.maxPlayersPerGame = 20;
config.mapScaleRanges = [
  {
    minPlayers: 1,
    maxPlayers: 4,
    scale: 0.7,
    maxMajorBuildings: 10,
    gameSpawnWindow: 180
  },
  {
    minPlayers: 5,
    maxPlayers: 12,
    scale: 0.85,
    maxMajorBuildings: 14,
    gameSpawnWindow: 150
  },
  {
    minPlayers: 13,
    maxPlayers: 20,
    scale: 1,
    gameSpawnWindow: 120
  }
];

await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

if (config.maxGames !== 4 || config.mapScaleRanges[0]?.gameSpawnWindow !== 180) {
  throw new Error("Queue tuning was not applied correctly");
}

console.log("Applied Shring small-group matchmaking and four-game capacity");
