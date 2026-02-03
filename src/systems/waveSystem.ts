import { Time, World, type System } from "@jael-ecs/core";
import Enemy from "../entities/Enemy";
import { Vector3 } from "three";
import type { WaveConfig } from "../entities/Engine";

export default function WaveSystem(world: World): System {
  const engine = world.include("isEngine").entities[0];
  const player = world.include("isPlayer").entities[0];

  const enemyPool: number[] = [];
  const spawnRate = 1;
  const randomPosition = new Vector3();

  let spawnedEnemies = 0;
  let maxEnemies = 0;
  let spawnTimer = 0;

  const waveConfig = engine.get<WaveConfig>("waveConfig");

  function createEnemy(pos: Vector3) {
    const enemy = Enemy(world, pos);
    enemy.add("target", player);
    enemyPool.push(enemy.id);
    spawnedEnemies += 1;
  }

  function spawnNextWave() {
    if (spawnedEnemies === maxEnemies) return;

    if (spawnTimer > spawnRate) {
      randomPosition.set(Math.random() * 10, 0, Math.random() * 10);
      createEnemy(randomPosition);
      spawnTimer = 0;
    }

    spawnTimer += Time.delta;
  }

  return {
    priority: 2,
    init() {
      // First wave enemies
      maxEnemies = waveConfig.enemiesPerWave;

      const enemyQuery = world.include("isEnemy");
      enemyQuery.on("removed", (id) => {
        const idx = enemyPool.indexOf(id);
        if (idx >= 0) {
          enemyPool.splice(idx, 1);
        }

        if (spawnedEnemies >= maxEnemies && enemyPool.length <= 0) {
          spawnedEnemies = 0;
          waveConfig.current += 1;
          maxEnemies = waveConfig.enemiesPerWave * waveConfig.current;
        }
      });
    },
    update() {
      if (waveConfig.current < waveConfig.maxWave) {
        spawnNextWave();
      } else {
        // Finish the game
        world.removeSystem(this);
      }
    },
  };
}
