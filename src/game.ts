import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./Rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import WaveSystem from "./systems/waveSystem";
import { FiniteState } from "./state";

export function mountExperience(state: GLState) {
  const world = new World();

  const engine = Engine(state, world);

  world.addSystem(GameEngine(world));
  world.addSystem(PlayerController(world));
  world.addSystem(EnemyAI(world));
  world.addSystem(WaveSystem(world));

  Time.on("update", () => {
    if (engine.get<FiniteState>("state").active?.name !== "start") return;
    RapierEngine.step();
    world.update();
  });
}
