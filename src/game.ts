import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./helpers/rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import WaveSystem from "./systems/waveSystem";
import { FiniteState } from "./helpers/state";
import {
  GLTFLoader,
  SkeletonUtils,
  type GLTF,
} from "three/examples/jsm/Addons.js";
import Player from "./entities/Player";

const loader = new GLTFLoader();
const getModelPath = (model: string) => `./models/${model}.gltf`;
export type LoadedModels = { [k: string]: GLTF };

const loadModel = async (model: string) =>
  await loader.loadAsync(getModelPath(model));

async function preloadModels(): Promise<LoadedModels> {
  const models = ["Character_Soldier", "Character_Enemy", "Character_Hazmat"];
  let loaded_models: LoadedModels = {};

  for (let model of models) {
    const data = await loadModel(model);
    loaded_models[model] = data;
  }

  return loaded_models;
}

export function mountExperience(state: GLState) {
  const world = new World();

  world.prefabManager.addDetector((value: any) => {
    if (value.isObject3D && value.getObjectByProperty("isSkinnedMesh", true))
      return "skeletal";
    if (value.clone !== undefined) return "clonable";
    return null;
  });
  world.prefabManager.addCloner("clonable", (v) => v.clone());
  world.prefabManager.addCloner("skeletal", (v) => SkeletonUtils.clone(v));

  const engine = Engine(state, world);

  preloadModels().then((models: LoadedModels) => {
    engine.add("assets", models);

    // Create Player Entity
    Player(world);

    world.addSystem(GameEngine(world));
    world.addSystem(PlayerController(world));
    world.addSystem(EnemyAI(world));
    world.addSystem(WaveSystem(world));

    Time.on("update", () => {
      if (engine.get<FiniteState>("state").active?.name !== "start") return;
      RapierEngine.step();
      world.update();
    });
  });
}
