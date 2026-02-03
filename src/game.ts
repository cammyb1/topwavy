import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./Rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import Player from "./entities/Player";
import WaveSystem from "./systems/waveSystem";

export function mountExperience(state: GLState) {
  const world = new World();

  // Create engine as entity
  Engine(state, world);

  // Create Player Entity
  Player(world);

  world.addSystem(GameEngine(world));
  world.addSystem(PlayerController(world));
  world.addSystem(EnemyAI(world));
  world.addSystem(WaveSystem(world));

  Time.on("update", () => {
    RapierEngine.step();
    world.update();
  });
}
