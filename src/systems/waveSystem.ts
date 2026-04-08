import { World, type Entity } from "@jael-ecs/core";
import Enemy from "../entities/Enemy";
import { FiniteState, type State } from "../helpers/state";
import { destroyEntityWithCollider, randomIn3DCircle, Time } from "../utils";
import { game, type WaveConfig } from "../store";
import { RigidBody } from "@dimforge/rapier3d";
import { type LoadedUIElements } from "../game";
import { showWaveEvent } from "../entities/Engine";
import { Group } from "three";
import type { HealthComponent } from "../components";

export default function WaveSystem(world: World) {
  const engine = world.include("isEngine").firstEntity();
  const playerQuery = world.include("isPlayer");

  const screens = engine?.getComponent<LoadedUIElements>(
    "screens",
  ) as LoadedUIElements;

  let enemyPool: number[] = [];
  const spawnRate = 1;

  let spawnedEnemies = 0;
  let killedEnemies = 0;
  let maxEnemies = 0;
  let spawnTimer = 0;

  let waveConfig: WaveConfig = game.getState().waveConfig;
  let spawnWaveTimer = waveConfig.sleepTime;

  maxEnemies = waveConfig.enemiesPerWave;
  killedEnemies = maxEnemies;

  game.subscribe((state) => {
    waveConfig = state.waveConfig;
    maxEnemies = waveConfig.enemiesPerWave;
    killedEnemies = maxEnemies;
    spawnWaveTimer = waveConfig.sleepTime;
  });

  function updateHTML() {
    const waveContainer = document.getElementById("wave-n");
    const enemiesLeft = document.getElementById("enemies-left");
    const enemiesTotal = document.getElementById("enemies-total");

    return {
      number() {
        if (waveContainer) {
          waveContainer.innerHTML = waveConfig.current.toString();
        }
      },
      enemies() {
        if (enemiesLeft) {
          enemiesLeft.innerHTML = killedEnemies.toString();
        }

        if (enemiesTotal) {
          enemiesTotal.innerHTML = maxEnemies.toString();
        }
      },
    };
  }

  function createEnemy() {
    if (playerQuery.size() <= 0) return;
    const playerT = playerQuery.entities[0].getComponent<Group>(
      "transform",
    ) as Group;
    const playerPos = playerT.position;
    const pos = randomIn3DCircle({
      radius: 10,
      center: [playerPos.x, playerPos.z],
    });
    const enemy = Enemy(world, pos);

    const rb = enemy.getComponent<RigidBody>("rigidbody");
    const machine = enemy.getComponent<FiniteState>("machine")!;

    if (!rb) return;

    rb.userData = {
      onCollisionStart: (e: Entity) => {
        if (e.getComponent("isBullet")) {
          const damage = e.getComponent<number>("damage");
          enemy.getComponent<HealthComponent>("health")!.current -= damage || 0;
          destroyEntityWithCollider(e.id, world);
          machine.setActiveState("hit");
        }
      },
    };

    enemyPool.push(enemy.id);
    spawnedEnemies += 1;

    updateHTML().enemies();
  }

  function spawnNextWave() {
    if (spawnedEnemies === maxEnemies) {
      return;
    }

    if (spawnTimer > spawnRate) {
      createEnemy();
      spawnTimer = 0;
    }

    spawnTimer += Time.delta;
  }

  const stateMachine = engine?.getComponent<FiniteState>("state");
  const onActiveWaveRemove = (id: number) => {
    const idx = enemyPool.indexOf(id);
    if (idx >= 0) {
      killedEnemies -= 1;
      enemyPool.splice(idx, 1);
    }

    updateHTML().enemies();

    if (spawnedEnemies >= maxEnemies && enemyPool.length <= 0) {
      if (waveConfig.current + 1 > waveConfig.maxWave) {
        engine?.getComponent<FiniteState>("state")!.setActiveState("finish");
        return;
      }

      spawnWaveTimer = 0;

      setTimeout(() => {
        spawnedEnemies = 0;
        waveConfig.current += 1;

        updateHTML().number();
        screens.playing.dispatchEvent(showWaveEvent);
        maxEnemies = waveConfig.enemiesPerWave * waveConfig.current;
        killedEnemies = maxEnemies;
        updateHTML().enemies();
      }, waveConfig.sleepTime * 1000);
    }
  };

  stateMachine?.on("change", (prev: State | undefined) => {
    if (!prev) return;
    if (stateMachine.active?.name === "playing") {
      updateHTML().enemies();
      updateHTML().number();
    }

    if (prev.name === "finish") {
      if (enemyPool.length > 0) {
        enemyQuery.off("removed", onActiveWaveRemove);
        enemyPool.forEach((id) => {
          destroyEntityWithCollider(id, world);
        });
        enemyPool = [];
        enemyQuery.on("removed", onActiveWaveRemove);
      }

      // Reset Wave config
      spawnedEnemies = 0;
      maxEnemies = waveConfig.enemiesPerWave;
      killedEnemies = maxEnemies;
      spawnTimer = 0;
      waveConfig.current = 1;
      updateHTML().number();
      updateHTML().enemies();
    }
  });

  const enemyQuery = world.include("isEnemy");
  enemyQuery.on("removed", onActiveWaveRemove);

  return () => {
    if (playerQuery.size() > 0) {
      if (waveConfig.current <= waveConfig.maxWave) {
        if (spawnWaveTimer <= waveConfig.sleepTime) {
          const spawnTimerContainer = document.getElementById("wave-nt");
          if (spawnTimerContainer) {
            spawnTimerContainer.innerHTML = `${Math.abs(spawnWaveTimer - waveConfig.sleepTime).toFixed(1)}s`;
          }
          spawnWaveTimer += Time.delta;
        }

        spawnNextWave();
      } else {
        engine?.getComponent<FiniteState>("state")!.setActiveState("finish");
      }
    }
  };
}
