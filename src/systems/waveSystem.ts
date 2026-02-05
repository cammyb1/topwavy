import { Time, World, type System } from "@jael-ecs/core";
import Enemy from "../entities/Enemy";
import { Vector3 } from "three";
import { type WaveConfig } from "../entities/Engine";
import { FiniteState } from "../state";
import { destroyEntityWithCollider } from "../utils";

export default function WaveSystem(world: World): System {
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");

  const enemyPool: number[] = [];
  const spawnRate = 1;
  const randomPosition = new Vector3();

  let spawnedEnemies = 0;
  let maxEnemies = 0;
  let spawnTimer = 0;

  const waveConfig = engine.get<WaveConfig>("waveConfig");

  function createEnemy(pos: Vector3) {
    const enemy = Enemy(world, pos);
    enemy.add("target", playerQuery.entities[0]);
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

      const stateMachine = engine.get<FiniteState>("state");
      const onActiveWaveRemove = (id: number) => {
        const idx = enemyPool.indexOf(id);
        if (idx >= 0) {
          enemyPool.splice(idx, 1);
        }

        if (spawnedEnemies >= maxEnemies && enemyPool.length <= 0) {
          spawnedEnemies = 0;
          waveConfig.current += 1;
          console.log("Current Wave: ", waveConfig.current);
          maxEnemies = waveConfig.enemiesPerWave * waveConfig.current;
        }
      };

      stateMachine.on("change", () => {
        if (stateMachine.active?.name === "start") {
          if (enemyPool.length > 0) {
            enemyQuery.off("removed", onActiveWaveRemove);
            enemyPool.forEach((id) => {
              destroyEntityWithCollider(id, world);
            });
            enemyQuery.on("removed", onActiveWaveRemove);
          }
        }

        if (stateMachine.active?.name === "finish") {
          // Reset Wave config
          spawnedEnemies = 0;
          maxEnemies = waveConfig.enemiesPerWave;
          spawnTimer = 0;
          waveConfig.current = 1;
        }
      });

      const enemyQuery = world.include("isEnemy");
      enemyQuery.on("removed", onActiveWaveRemove);
    },
    update() {
      if (waveConfig.current < waveConfig.maxWave) {
        spawnNextWave();
      } else {
        engine.get("state").setActiveState("finish");
      }
    },
  };
}
