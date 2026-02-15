import { Time, World, type Entity, type System } from "@jael-ecs/core";
import Enemy from "../entities/Enemy";
import { FiniteState, type State } from "../helpers/state";
import {
  destroyEntityWithCollider,
  PRIORITY_LIST,
  randomIn3DCircle,
} from "../utils";
import { game, type WaveConfig } from "../store";
import { RigidBody } from "@dimforge/rapier3d";
import { type LoadedUIElements } from "../game";
import { showWaveEvent } from "../entities/Engine";
import { Group } from "three";

export default function WaveSystem(world: World): System {
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");

  const screens = engine.get<LoadedUIElements>("screens");

  const enemyPool: number[] = [];
  const spawnRate = 1;

  let spawnedEnemies = 0;
  let maxEnemies = 0;
  let spawnTimer = 0;

  let waveConfig: WaveConfig = game.getState().waveConfig;
  maxEnemies = waveConfig.enemiesPerWave;

  game.subscribe((state) => {
    waveConfig = state.waveConfig;

    maxEnemies = waveConfig.enemiesPerWave;
  });

  function createEnemy() {
    if (playerQuery.size() <= 0) return;
    const playerPos = playerQuery.entities[0].get<Group>("transform").position;
    const pos = randomIn3DCircle({
      radius: 10,
      center: [playerPos.x, playerPos.z],
    });
    const enemy = Enemy(world, pos);

    const rb = enemy.get<RigidBody>("rigidbody");
    const machine = enemy.get("machine");

    rb.userData = {
      onCollisionStart: (e: Entity) => {
        if (e.get("isBullet")) {
          const damage = e.get<number>("damage");
          enemy.get("health").current -= damage;
          destroyEntityWithCollider(e.id, world);
          machine.setActiveState("hit");
        }
      },
    };

    enemyPool.push(enemy.id);
    spawnedEnemies += 1;
  }

  function spawnNextWave() {
    if (spawnedEnemies === maxEnemies) return;

    if (spawnTimer > spawnRate) {
      createEnemy();
      spawnTimer = 0;
    }

    spawnTimer += Time.delta;
  }

  const stateMachine = engine.get<FiniteState>("state");
  const onActiveWaveRemove = (id: number) => {
    const idx = enemyPool.indexOf(id);
    if (idx >= 0) {
      enemyPool.splice(idx, 1);
    }

    if (spawnedEnemies >= maxEnemies && enemyPool.length <= 0) {
      const waveContainer = document.getElementById("wave-n");
      setTimeout(() => {
        spawnedEnemies = 0;
        waveConfig.current += 1;

        if (waveConfig.current > waveConfig.maxWave) {
          engine.get("state").setActiveState("finish");
          return;
        }

        if (waveContainer) {
          waveContainer.innerHTML = waveConfig.current.toString();
          screens.wave_info.dispatchEvent(showWaveEvent);
        }
        maxEnemies = waveConfig.enemiesPerWave * waveConfig.current;
      }, waveConfig.sleepTime * 1000);
    }
  };

  stateMachine.on("change", (prev: State | undefined) => {
    if (!prev) return;
    if (prev.name === "finish") {
      if (enemyPool.length > 0) {
        enemyQuery.off("removed", onActiveWaveRemove);
        enemyPool.forEach((id) => {
          destroyEntityWithCollider(id, world);
        });
        enemyQuery.on("removed", onActiveWaveRemove);
      }

      // Reset Wave config
      spawnedEnemies = 0;
      maxEnemies = waveConfig.enemiesPerWave;
      spawnTimer = 0;
      waveConfig.current = 1;
    }
  });

  const enemyQuery = world.include("isEnemy");
  enemyQuery.on("removed", onActiveWaveRemove);

  return {
    priority: PRIORITY_LIST.REST,
    update() {
      if (playerQuery.size() > 0) {
        if (waveConfig.current <= waveConfig.maxWave) {
          spawnNextWave();
        } else {
          engine.get("state").setActiveState("finish");
        }
      }
    },
  };
}
