import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./Rapier";
import { Engine, GameStates } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import Player from "./entities/Player";
import WaveSystem from "./systems/waveSystem";
import { Input } from "./Input";
import { isPaused } from "./utils";

export function mountExperience(state: GLState) {
  const world = new World();

  // Create engine as entity
  const engine = Engine(state, world);

  // Create Player Entity
  Player(world);

  world.addSystem(GameEngine(world));
  world.addSystem(PlayerController(world));
  world.addSystem(EnemyAI(world));
  world.addSystem(WaveSystem(world));

  Input.on("down", ({ code }) => {
    if (code === "Space") {
      switch (engine.get("state").current) {
        case GameStates.IDLE: {
          engine.get("state").current = GameStates.STARTED;
          break;
        }
        case GameStates.STARTED: {
          engine.get("state").current = GameStates.PAUSED;
          break;
        }
        case GameStates.PAUSED: {
          engine.get("state").current = GameStates.STARTED;
          break;
        }
      }
    }
  });

  Time.on("update", () => {
    if (isPaused(engine.get("state").current)) return;
    RapierEngine.step();
    world.update();
  });
}
